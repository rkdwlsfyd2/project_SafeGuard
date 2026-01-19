"""
rag/query.py
: 검색 (Retrieval) 모듈

[역할]
- 사용자의 질문(Query)을 받아 관련 법령 데이터를 검색하여 반환
- Vector Search(의미 기반)와 BM25(키워드 기반)를 결합한 Hybrid Search 수행

[주요 기능]
- ask: 메인 검색 함수 (Hybrid Search 실행 후 상위 결과 반환)
- perform_vector_search: Milvus를 이용한 벡터 유사도 검색
- perform_bm25_search: BM25 인덱스를 이용한 키워드 검색
- reciprocal_rank_fusion (RRF): 두 검색 결과를 순위 기반으로 재정렬(Reranking)하여 통합

[시스템 흐름]
1. 사용자 질문 입력
2. 병렬 검색 수행
   - A. Vector Search: 질문 임베딩 -> Milvus 검색 (Semantic)
   - B. BM25 Search: 질문 형태소 분석 -> 키워드 매칭 (Lexical)
3. RRF 알고리즘으로 두 검색 결과 융합 (Score = 1 / (rank + k))
4. 최종 상위 문서 리스트 반환

[파일의 핵심목적]
- 단일 검색 방식의 한계를 보완하기 위해 '의미'와 '키워드'를 모두 고려하는 고성능 검색 파이프라인 제공
"""

from __future__ import annotations

import logging
import os
import pickle
from typing import Any, Dict, List

import numpy as np
from kiwipiepy import Kiwi
from sentence_transformers import SentenceTransformer

from milvus_client import get_collection

logger = logging.getLogger(__name__)

# =========================
# 모델 및 리소스 로드
# =========================

# 문장 임베딩 모델 (MiniLM)
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

# BM25 인덱스 파일 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BM25_PATH = os.path.join(BASE_DIR, "rag_data", "bm25_index.pkl")

# Kiwi 형태소 분석기 (BM25 토큰화 용)
kiwi = Kiwi()

# BM25 데이터 컨테이너
bm25_data: Dict[str, Any] | None = None

# BM25 인덱스 로드 (서버 시작 시 1회 로드)
if os.path.exists(BM25_PATH):
    try:
        with open(BM25_PATH, "rb") as f:
            bm25_data = pickle.load(f)
        logger.info("[BM25] index loaded from %s", BM25_PATH)
    except Exception as e:
        logger.exception("[BM25] failed to load index: %s", e)
        bm25_data = None
else:
    logger.warning("[BM25] index file not found at %s", BM25_PATH)
    bm25_data = None


# =========================
# 헬퍼 함수
# =========================
def _normalize_vector_score(distance_value: float, metric_type: str = "COSINE") -> float:
    """
    Milvus 거리 값을 '직관적인 점수(클수록 좋음)'로 변환합니다.
    Cosine Distance (0~2) -> Similarity (1 ~ -1) 개념으로 보정
    """
    m = (metric_type or "").upper()

    if m == "COSINE":
        v = float(distance_value)

        # 1.0을 넘으면 거리(Distance)로 간주하여 변환
        if v > 1.0:
            score = 1.0 - v
        else:
            score = v

        # 음수는 0으로 처리
        return max(0.0, float(score))

    return float(distance_value)


# =========================
# BM25 검색 (키워드)
# =========================
def perform_bm25_search(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    키워드 기반 검색 (Lexical Search)
    """
    if not bm25_data:
        return []

    # 질문 토큰화
    tokens = [token.form for token in kiwi.tokenize(query)]

    # 점수 계산
    scores = bm25_data["bm25"].get_scores(tokens)

    # 상위 k개 추출
    top_indexes = np.argsort(scores)[::-1][:top_k]

    results: List[Dict[str, Any]] = []
    for idx in top_indexes:
        # 무의미한 점수(0 이하) 제외
        if scores[idx] <= 0:
            continue

        results.append(
            {
                "text": bm25_data["texts"][idx],
                "source": bm25_data["sources"][idx],
                "score": float(scores[idx]),
                "type": "bm25",
            }
        )

    return results


# =========================
# Vector 검색 (의미)
# =========================
def perform_vector_search(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    벡터 유사도 기반 검색 (Semantic Search)
    Metrics: Cosine Similarity
    """
    # 컬렉션 로드
    collection = get_collection()

    # 질문 임베딩 생성
    vec = model.encode(query).tolist()

    # Milvus 검색 수행
    metric_type = "COSINE"
    results = collection.search(
        data=[vec],
        anns_field="embedding",
        param={"metric_type": metric_type, "params": {"nprobe": 10}},
        limit=top_k,
        output_fields=["text", "source"],
    )

    hits: List[Dict[str, Any]] = []
    for hit in results[0]:
        raw_distance = float(hit.distance)
        norm_score = _normalize_vector_score(raw_distance, metric_type=metric_type)

        hits.append(
            {
                "text": hit.entity.get("text"),
                "source": hit.entity.get("source"),
                "score": norm_score,           # 정규화된 점수
                "raw_distance": raw_distance,  # 원본 거리값 (디버깅용)
                "type": "vector",
            }
        )

    return hits


# =========================
# RRF (Hybrid Fusion)
# =========================
def reciprocal_rank_fusion(
    vector_results: List[Dict[str, Any]],
    bm25_results: List[Dict[str, Any]],
    k: int = 60,
) -> List[Dict[str, Any]]:
    """
    RRF(Reciprocal Rank Fusion): 순위 기반 결과 통합
    Score = Σ 1 / (k + rank + 1)
    """
    fused_scores: Dict[str, Dict[str, Any]] = {}

    def process_results(results: List[Dict[str, Any]]) -> None:
        for rank, item in enumerate(results):
            # 텍스트 내용으로 중복 제거 및 식별
            doc_key = item.get("text", "")
            if not doc_key:
                continue

            if doc_key not in fused_scores:
                fused_scores[doc_key] = {"score": 0.0, "item": item}

            # 순위가 높을수록(rank가 작을수록) 높은 점수 부여
            fused_scores[doc_key]["score"] += 1.0 / (k + rank + 1)

    process_results(vector_results)
    process_results(bm25_results)

    # 통합 점수 기준 내림차순 정렬
    sorted_results = sorted(fused_scores.values(), key=lambda x: x["score"], reverse=True)

    final_output: List[Dict[str, Any]] = []
    for res in sorted_results:
        item = res["item"]
        item["rrf_score"] = float(res["score"])
        final_output.append(item)

    return final_output


# =========================
# Public API: ask()
# =========================
def ask(question: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    [통합 검색]
    사용자 질문 -> Hybrid Search(Vector + BM25) -> RRF 재정렬 -> 결과 반환
    """
    # 1) Vector Search (넉넉하게 검색)
    vector_hits = perform_vector_search(question, top_k=top_k * 2)

    # 2) BM25 Search (넉넉하게 검색)
    bm25_hits = perform_bm25_search(question, top_k=top_k * 2)

    # 3) Hybrid Fusion (RRF)
    if bm25_hits:
        logger.info("Hybrid Search: Vector(%d) + BM25(%d)", len(vector_hits), len(bm25_hits))
        merged_results = reciprocal_rank_fusion(vector_hits, bm25_hits)
        return merged_results[:top_k]

    # BM25 사용 불가 시 Vector 결과만 반환
    return vector_hits[:top_k]


if __name__ == "__main__":
    # 로컬 테스트용
    results = ask("마트에서 산 빵에 이물질이 들어있어요", top_k=5)
    for res in results:
        print(
            f"[SOURCE] 출처: {res.get('source')} "
            f"(score: {res.get('score', 0.0):.4f}, raw_distance: {res.get('raw_distance', 0.0):.4f})"
        )
        print((res.get("text") or "")[:100] + "...")
        print("-" * 50)