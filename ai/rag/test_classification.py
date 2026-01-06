from query import ask
from collections import Counter

# 문서 출처 기반 기관 매핑 규칙
AGENCY_MAPPING = {
    "도로교통": "경찰청 / 지자체 (Police/Local Gov)",
    "환경": "환경부 (Ministry of Environment)",
    "물환경": "환경부 (Ministry of Environment)",
    "자연": "환경부 (Ministry of Environment)",
    "개인정보": "개인정보보호위원회 (PIPC)",
    "민원": "국민권익위원회 (ACRC) / 행정안전부",
    "형법": "법무부 (Ministry of Justice) / 경찰청",
    "행정": "행정안전부 (Ministry of the Interior and Safety)"
}

def classify_complaint(user_query):
    """
    사용자의 민원 내용을 분석하여 담당 기관을 분류합니다.
    하이브리드 검색(Vector + BM25)을 통해 관련 법령을 찾고, 
    검색된 문서의 출처(파일명)를 기반으로 담당 기관을 추론합니다.

    Args:
        user_query (str): 사용자 민원 내용

    Returns:
        str: 분류된 담당 기관명 (예: '경찰청', '환경부' 등)
    """
    print(f"\n🔹 질문: {user_query}")
    
    # 1. 관련 문서 검색
    results = ask(user_query, top_k=5)
    
    if not results:
        return "관련 법령을 찾을 수 없습니다."

    # 2. 출처 분석
    detected_sources = [r['source'] for r in results]
    agency_counts = Counter()
    
    print("🔎 검색된 법령 근거:")
    for r in results:
        # 점수 유형에 따른 라벨링
        score_val = r.get('score', 0)
        rtype = r.get('type', 'unknown')
        
        if rtype == 'vector':
            score_label = f"벡터 유사도: {score_val:.4f} (기준: 0.4↑ 양호, 0.6↑ 우수)"
        elif rtype == 'bm25':
            score_label = f"BM25 키워드 점수: {score_val:.2f} (절대값, 높을수록 정확)"
        else:
            # RRF 결과인 경우 (Merged) - rrf_score가 별도로 있을 수 있음
            rrf_score = r.get('rrf_score', 0)
            score_label = f"통합 랭킹(RRF): {rrf_score:.4f} (벡터+BM25 순위 결합)"

        print(f" - [{rtype.upper()}] {r['source']} | {score_label}")
        
        # 파일명 내 단순 키워드 매칭
        matched = False
        for key, agency in AGENCY_MAPPING.items():
            if key in r['source']:
                agency_counts[agency] += 1
                matched = True
        
        if not matched:
            agency_counts["기타/미분류"] += 1

    # 3. 최적 기관 결정
    if not agency_counts:
        print("\n🤔 판단 근거: 관련 법령 내에서 담당 기관 정보를 찾을 수 없습니다.")
        return "기관을 특정할 수 없습니다."
        
    best_agency = agency_counts.most_common(1)[0][0]
    best_count = agency_counts.most_common(1)[0][1]
    total_docs = len(results)
    
    # 근거 텍스트 생성
    reasoning = f"검색된 연관 법령 {total_docs}건 중 {best_count}건이 '{best_agency}' 소관으로 식별됨."
    
    print(f"\n💡 판단 근거: {reasoning}")
    print(f"🏆 추천 담당 기관: {best_agency}")
    return best_agency

if __name__ == "__main__":
    # Test Cases
    test_queries = [
        "집 앞에 불법주차된 차 때문에 통행이 불편해요.",
        "공장에서 폐수를 하천으로 무단 방류하고 있습니다.",
        "웹사이트에서 제 주민등록번호가 노출되었어요. 처벌 가능한가요?",
        "시청 직원이 불친절하게 민원을 처리했습니다."
    ]
    
    for q in test_queries:
        classify_complaint(q)
        print("="*60)
