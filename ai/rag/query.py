"""
rag/query.py

질문 → 검색 → 반환 (Retrieval Module)

이 모듈은 사용자 질문을 입력받아 다음 두 경로로 관련 법령 텍스트를 검색(Retrieve)합니다.

1) Vector Search (Semantic Retrieval)
   - SentenceTransformer로 질문을 임베딩 벡터로 변환
   - Milvus Vector DB에서 Top-K 검색 수행
   - Milvus Python SDK는 검색 점수를 `hit.distance`로 노출합니다.
     단, 이 값이 "유사도"인지 "거리"인지는 metric_type / Milvus 버전 / 인덱스 설정에 따라 달라질 수 있습니다.
     따라서 본 모듈은 아래 원칙으로 점수를 '유사도 스케일(클수록 좋음)'로 정규화합니다.

     [정규화 원칙]
     - COSINE:
         * 일부 환경에서는 hit.distance가 cosine "distance"(0~2)로 나오고,
           일부 환경에서는 "similarity"로 나오기도 합니다.
         * 실사용에서 혼선을 줄이기 위해, 값 범위로 휴리스틱 보정합니다.
           - distance로 보이는 값(> 1.0 이거나 [0, 2]에 가까운 경우): similarity = 1 - distance
           - similarity로 보이는 값(<= 1.0 이고 일반적 similarity 범위): 그대로 사용
     - L2 / IP 등:
         * 기본 구현은 COSINE에 맞춰져 있으며, 필요 시 metric별 보정 함수를 분리해 확장 가능합니다.

2) BM25 Search (Lexical Retrieval)
   - Kiwi 형태소 분석기로 질문을 토큰화
   - 사전에 생성된 BM25 인덱스(pkl)를 로드하여 키워드 기반 점수 계산
   - 점수(score)가 0 이하인 문서는 의미 있는 매칭이 아닌 경우가 많으므로 제외(노이즈 제거)

3) Hybrid Search (RRF: Reciprocal Rank Fusion)
   - Vector 결과와 BM25 결과를 단순 점수 결합하지 않고 "순위 기반"으로 융합(RRF)
   - Score = Σ (1 / (k + rank)) 방식으로 결과를 통합하여 상위 문서를 반환
   - 점수 스케일 차이(코사인 vs BM25)를 직접 더할 때 발생하는 불안정성을 회피하는 장점이 있음

[비고]
- ingest.py 단계에서 Milvus 적재 및 bm25_index.pkl 생성이 완료되어야 정상 동작합니다.
- 로깅 포맷(JSON 등)은 앱 엔트리 포인트에서 logging_config.setup_logging()을 호출해 통일하는 것을 권장합니다.
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
# Model / Resource Load
# =========================

# 문장 임베딩 모델
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

# BM25 인덱스 파일 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BM25_PATH = os.path.join(BASE_DIR, "rag_data", "bm25_index.pkl")

# Kiwi 형태소 분석기 (BM25 토큰화 용)
kiwi = Kiwi()

# BM25 데이터(인덱스/텍스트/소스)를 담는 컨테이너
bm25_data: Dict[str, Any] | None = None

# BM25 인덱스 로드
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
# Helpers
# =========================
def _normalize_vector_score(distance_value: float, metric_type: str = "COSINE") -> float:
    """
    Milvus hit.distance 값을 '클수록 좋은 점수(score)'로 정규화합니다.

    - COSINE의 경우 환경에 따라 distance(거리) 또는 similarity(유사도)로 반환될 수 있어,
      값 범위를 기준으로 휴리스틱하게 보정합니다.

    Args:
        distance_value: hit.distance의 float 값
        metric_type: 사용한 metric_type (기본 COSINE)

    Returns:
        float: 정규화된 점수(클수록 좋음)
    """
    m = (metric_type or "").upper()

    if m == "COSINE":
        v = float(distance_value)

        # 휴리스틱:
        # - distance로 보이는 값: 보통 0~2 범위(특히 >1.0이 자주 distance 성격)
        # - similarity로 보이는 값: 보통 -1~1 또는 0~1
        #
        # 실무에서는 보통 similarity(0~1 근방)을 기대하므로,
        # v가 1.0을 넘으면 distance로 간주하여 1 - v로 변환합니다.
        if v > 1.0:
            score = 1.0 - v
        else:
            score = v

        # 너무 과도한 음수는 안정적으로 클램프(옵션)
        # score가 음수여도 랭킹에는 사용될 수 있으나, 여기서는 0으로 하한을 둡니다.
        return max(0.0, float(score))

    # 다른 metric을 쓰는 경우, 기본은 원값을 그대로 반환(확장 지점)
    return float(distance_value)


# =========================
# BM25 Search
# =========================
def perform_bm25_search(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    BM25 알고리즘을 사용하여 키워드 기반(Lexical) 검색을 수행합니다.

    Args:
        query: 사용자 질문
        top_k: 반환할 상위 문서 개수

    Returns:
        [{"text": ..., "source": ..., "score": float, "type": "bm25"}, ...]
    """
    if not bm25_data:
        return []

    # 토큰화
    tokens = [token.form for token in kiwi.tokenize(query)]

    # BM25 점수 계산
    scores = bm25_data["bm25"].get_scores(tokens)

    # 상위 k개 인덱스 추출 (점수 내림차순)
    top_indexes = np.argsort(scores)[::-1][:top_k]

    results: List[Dict[str, Any]] = []
    for idx in top_indexes:
        # score <= 0 문서는 사실상 매칭이 없거나 노이즈일 가능성이 높아 제외
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
# Vector Search (Milvus)
# =========================
def perform_vector_search(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Milvus를 사용하여 벡터 유사도 기반(Semantic) 검색을 수행합니다.

    Args:
        query: 사용자 질문
        top_k: 반환할 상위 문서 개수

    Returns:
        [{"text": ..., "source": ..., "score": float, "type": "vector"}, ...]
    """
    # 컬렉션 가져오기
    collection = get_collection()

    # 질문 임베딩
    vec = model.encode(query).tolist()

    # Milvus 검색
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
                # 정규화된 점수(클수록 좋은 score)
                "score": norm_score,
                # 디버그/검증용으로 원본도 함께 노출(원하면 제거 가능)
                "raw_distance": raw_distance,
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
    RRF(Reciprocal Rank Fusion)로 Vector/BM25 결과를 순위 기반으로 결합합니다.

    Score = Σ 1 / (k + rank + 1)

    - 점수 스케일이 서로 다른 두 검색 결과를 단순 합산하지 않고,
      순위(rank) 중심으로 안정적으로 결합하는 방법입니다.

    Args:
        vector_results: 벡터 검색 결과 리스트
        bm25_results: BM25 검색 결과 리스트
        k: RRF 상수 (일반적으로 60을 많이 사용)

    Returns:
        rrf_score가 추가된 통합 결과 리스트 (내림차순 정렬)
    """
    fused_scores: Dict[str, Dict[str, Any]] = {}

    def process_results(results: List[Dict[str, Any]]) -> None:
        for rank, item in enumerate(results):
            # 텍스트를 고유 키로 사용 (중복 제거)
            doc_key = item.get("text", "")
            if not doc_key:
                continue

            if doc_key not in fused_scores:
                fused_scores[doc_key] = {"score": 0.0, "item": item}

            fused_scores[doc_key]["score"] += 1.0 / (k + rank + 1)

    process_results(vector_results)
    process_results(bm25_results)

    # 스코어 내림차순 정렬
    sorted_results = sorted(fused_scores.values(), key=lambda x: x["score"], reverse=True)

    # 최종 결과 포맷팅
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
    사용자 질문에 대해 Hybrid Search(Vector + BM25)를 수행하고,
    RRF로 결과를 통합하여 상위 top_k 개 문서를 반환합니다.

    Args:
        question: 사용자 질문
        top_k: 최종 반환할 상위 문서 개수

    Returns:
        검색된 법령 문서 리스트
    """
    # 1) Vector Search: 후보군을 조금 더 넉넉히 확보
    vector_hits = perform_vector_search(question, top_k=top_k * 2)

    # 2) BM25 Search: 후보군을 조금 더 넉넉히 확보
    bm25_hits = perform_bm25_search(question, top_k=top_k * 2)

    # 3) Hybrid (RRF)
    if bm25_hits:
        logger.info("Hybrid Search: Vector(%d) + BM25(%d)", len(vector_hits), len(bm25_hits))
        merged_results = reciprocal_rank_fusion(vector_hits, bm25_hits)
        return merged_results[:top_k]

    # BM25 인덱스가 없거나 실패한 경우: Vector 결과만 반환
    return vector_hits[:top_k]


if __name__ == "__main__":
    # 불법주정차는 하드룰이 있다고 하셨으니, 로컬 테스트는 '식품 이물' 같은 케이스가 적합합니다.
    results = ask("마트에서 산 빵에 이물질이 들어있어요", top_k=5)
    for res in results:
        # score: 정규화된 점수(클수록 좋음)
        # raw_distance: Milvus hit.distance 원값(디버깅용)
        print(
            f"[SOURCE] 출처: {res.get('source')} "
            f"(score: {res.get('score', 0.0):.4f}, raw_distance: {res.get('raw_distance', 0.0):.4f})"
        )
        print((res.get("text") or "")[:100] + "...")
        print("-" * 50)