'''
    질문 → 검색 → 답변
    rag/query.py
    : 사용자 질문을 받아 Milvus(Vector DB)에서
    관련 법령 텍스트를 검색(Retrieve)하는 모듈

    [역할]
    - RAG 파이프라인 중 Retrieve 단계 담당
    - ingest.py에서 사전에 저장된 벡터 데이터를 조회
    - 검색 결과를 LLM 프롬프트의 컨텍스트로 제공

    [동작 요약]
    - 사용자 질문을 임베딩 벡터로 변환
    - Milvus에서 벡터 유사도 검색 수행
    - 관련 법령 텍스트와 출처 정보 반환

    [동작 순서]
    1. Milvus 서버(localhost:19530)에 연결
    2. law_rag 컬렉션 로드
    3. SentenceTransformer 임베딩 모델 로드
    4. 사용자 질문 입력
    5. 질문 문장을 벡터로 변환
    6. Milvus 벡터 검색 수행 (COSINE 유사도 기준)
    7. 상위 top_k 개의 검색 결과 반환
    - 법령 원문 텍스트(text)
    - 출처 PDF 파일명(source)

    [사용 예시]
    - ask("불법주정차 신고는 어디에 해야 하나요?")
    - ask("개인정보 처리 위반 시 처벌 규정은?")

    [비고]
    - 본 파일은 검색 테스트 및 RAG 질의 용도로 사용
    - 실제 서비스 환경에서는
    검색 결과를 LLM 프롬프트에 전달하여
    최종 답변 + 근거 법령 설명을 생성
'''

from pymilvus import connections, Collection
from sentence_transformers import SentenceTransformer
from milvus_client import get_collection

# connections.connect 제거 (milvus_client.get_collection 내부에서 처리)
# collection 로드도 함수 내부로 이동

model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

import pickle
import os
import numpy as np
from kiwipiepy import Kiwi
from rank_bm25 import BM25Okapi

# BM25 인덱스 로드
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BM25_PATH = os.path.join(BASE_DIR, 'rag_data', 'bm25_index.pkl')

bm25_data = None
kiwi = Kiwi()

if os.path.exists(BM25_PATH):
    try:
        with open(BM25_PATH, "rb") as f:
            bm25_data = pickle.load(f)
        print(f"[INFO] BM25 index loaded from {BM25_PATH}")
    except Exception as e:
        print(f"[ERROR] Failed to load BM25 index: {e}")
else:
    print(f"[WARNING] BM25 index file not found at {BM25_PATH}")

def perform_bm25_search(query, top_k=5):
    """
    BM25 알고리즘을 사용하여 키워드 기반 검색을 수행합니다.
    
    Args:
        query (str): 사용자 질문
        top_k (int): 반환할 상위 문서 개수

    Returns:
        list: 검색된 문서 리스트 (점수 및 메타데이터 포함)
    """
    if not bm25_data:
        return []
    
    tokens = [token.form for token in kiwi.tokenize(query)]
    scores = bm25_data["bm25"].get_scores(tokens)
    
    # 상위 k개 인덱스 추출
    top_indexes = np.argsort(scores)[::-1][:top_k]
    
    results = []
    for idx in top_indexes:
        if scores[idx] > 0: # 점수가 0이면 제외
            results.append({
                "text": bm25_data["texts"][idx],
                "source": bm25_data["sources"][idx],
                "score": scores[idx],
                "type": "bm25"
            })
    return results

def perform_vector_search(query, top_k=5):
    """
    Milvus를 사용하여 벡터 유사도 기반 검색을 수행합니다.
    
    Args:
        query (str): 사용자 질문
        top_k (int): 반환할 상위 문서 개수

    Returns:
        list: 검색된 문서 리스트 (유사도 거리 및 메타데이터 포함)
    """
    # 컬렉션 가져오기 (연결 확인 포함)
    collection = get_collection()
    
    vec = model.encode(query).tolist()
    results = collection.search(
        data=[vec],
        anns_field="embedding",
        param={"metric_type": "COSINE", "params": {"nprobe": 10}},
        limit=top_k,
        output_fields=["text", "source"]
    )
    
    hits = []
    for hit in results[0]:
        hits.append({
            "text": hit.entity.get("text"),
            "source": hit.entity.get("source"),
            "score": hit.distance, # 코사인 거리(유사도) 사용
            "type": "vector"
        })
    return hits

def reciprocal_rank_fusion(vector_results, bm25_results, k=60):
    """
    RRF(Reciprocal Rank Fusion) 알고리즘을 사용하여 두 검색 결과를 재정렬하고 통합합니다.
    Score = 1 / (k + rank) 공식을 사용합니다.
    
    Args:
        vector_results (list): 벡터 검색 결과 리스트
        bm25_results (list): BM25 검색 결과 리스트
        k (int): RRF 상수 (기본값 60)

    Returns:
        list: 통합되고 정렬된 최종 문서 리스트
    """
    fused_scores = {}
    
    # 헬퍼 함수: 결과를 딕셔너리로 변환
    def process_results(results):
        for rank, item in enumerate(results):
            # 텍스트를 고유 키로 사용 (중복 제거)
            doc_key = item['text']
            if doc_key not in fused_scores:
                fused_scores[doc_key] = {"score": 0, "item": item}
            
            # RRF 스코어 계산: 1 / (k + rank)
            fused_scores[doc_key]["score"] += 1 / (k + rank + 1)
            
    process_results(vector_results)
    process_results(bm25_results)
    
    # 스코어 내림차순 정렬
    sorted_results = sorted(fused_scores.values(), key=lambda x: x['score'], reverse=True)
    
    # 최종 결과 포맷팅
    final_output = []
    for res in sorted_results:
        item = res['item']
        item['rrf_score'] = res['score']
        final_output.append(item)
        
    return final_output

def ask(question, top_k=5):
    """
    사용자 질문에 대해 하이브리드 검색(Vector + BM25)을 수행합니다.
    두 검색 결과를 RRF 알고리즘으로 결합하여 최적의 법령 정보를 반환합니다.

    Args:
        question (str): 사용자 질문
        top_k (int): 최종 반환할 상위 문서 개수

    Returns:
        list: 검색된 법령 문서 리스트
    """
    # 1. 벡터 검색
    vector_hits = perform_vector_search(question, top_k=top_k*2) # 더 많은 후보군 가져옴
    
    # 2. 키워드 검색
    bm25_hits = perform_bm25_search(question, top_k=top_k*2)
    
    # 3. Hybrid (RRF)
    if bm25_hits:
        print(f"Hybrid Search: Vector({len(vector_hits)}) + BM25({len(bm25_hits)})")
        merged_results = reciprocal_rank_fusion(vector_hits, bm25_hits)
        return merged_results[:top_k]
    else:
        # BM25 실패 시 벡터 검색 결과만 반환
        return vector_hits[:top_k]

if __name__ == "__main__":
    results = ask("불법주정차 신고는 어디에 해야 하나요?")
    for res in results:
        print(f"[SOURCE] 출처: {res['source']} (유사도: {res['distance']:.4f})")
        print(res['text'][:100] + "...")
        print("-" * 50)