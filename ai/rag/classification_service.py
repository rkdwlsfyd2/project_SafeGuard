"""
classification_service.py

[역할 설명]
이 파일은 RAG 기반 민원 분류 시스템에서
'검색 결과(query.py)'를 바탕으로 실제 행정기관을 최종 결정하는
분류 판단 레이어(Classification Layer)입니다.

- query.py : 벡터 검색 + BM25 검색 (의미 기반 Retrieval)
- classification_service.py : 검색 결과를 행정 도메인 기준으로 해석 및 보정 (Rule-based Decision)

이 파일은 단순 검색 결과를 넘어, 
특정 키워드에 대한 강제 규칙(Hard Rules)과 가중치 로직을 통해 분류 정확도를 보정합니다.
"""

import os
import logging
import unicodedata
from collections import Counter
from query import ask

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ======================================================
# 키워드 → 기관 매핑 (rag_data 기반, 보조 힌트용)
# ======================================================
KEYWORD_TO_AGENCY = {

    # 경찰청 / 치안
    "도로교통": "경찰청",
    "교통위반": "경찰청",
    "불법주정차": "경찰청",
    "신호위반": "경찰청",
    "과속": "경찰청",
    "음주운전": "경찰청",

    # 국토교통부 (교통·건설·시설)
    "주차장": "국토교통부",
    "도로": "국토교통부",
    "포트홀": "국토교통부",
    "싱크홀": "국토교통부",
    "건축": "국토교통부",
    "건축물": "국토교통부",
    "불법건축": "국토교통부",
    "아파트": "국토교통부",
    "공동주택": "국토교통부",
    "관리비": "국토교통부",
    "시설물": "국토교통부",
    "지하안전": "국토교통부",
    "지반침하": "국토교통부",
    "옥외광고": "국토교통부",

    # 기후에너지환경부 (환경 민원)
    "환경": "기후에너지환경부",
    "악취": "기후에너지환경부",
    "냄새": "기후에너지환경부",
    "하수": "기후에너지환경부",
    "하수구": "기후에너지환경부",
    "배수구": "기후에너지환경부",
    "오수": "기후에너지환경부",
    "정화조": "기후에너지환경부",
    "폐수": "기후에너지환경부",
    "하천": "기후에너지환경부",
    "수질": "기후에너지환경부",
    "쓰레기": "기후에너지환경부",
    "불법투기": "기후에너지환경부",
    "소음": "기후에너지환경부",
    "진동": "기후에너지환경부",
    "빛공해": "기후에너지환경부",

    # 소방청
    "소방": "소방청",
    "화재": "소방청",
    "소화기":"소방청",
    "소화전":"소방청",

    # 보건복지부 / 식약처
    "감염병": "보건복지부",
    "전염병": "보건복지부",
    "보건": "보건복지부",
    "식품": "식품의약품안전처",
    "위생": "식품의약품안전처",

    # 고용노동부
    "근로": "고용노동부",
    "노동": "고용노동부",
    "임금": "고용노동부",
    "체불": "고용노동부",
    "해고": "고용노동부",

    # 행정
    "민원": "국민권익위원회",
    "청원": "국민권익위원회",
    "지방자치": "행정안전부",

    # 교육
    "학교": "교육부",
    "교육": "교육부",
}

# ======================================================
# 기관 코드 (절대 기준)
# ======================================================
AGENCY_CODES = {
    "경찰청": 0,
    "국토교통부": 1,
    "고용노동부": 2,
    "국방부": 3,
    "국민권익위원회": 4,
    "식품의약품안전처": 5,
    "대검찰청": 6,
    "기획재정부": 7,
    "행정안전부": 8,
    "보건복지부": 9,
    "과학기술정보통신부": 10,
    "국세청": 11,
    "기후에너지환경부": 12,
    "법무부": 13,
    "공정거래위원회": 14,
    "교육부": 15,
    "해양수산부": 16,
    "농림축산식품부": 17,
    "소방청": 18,
    "인사혁신처": 19,
    "기타": 20
}

# ======================================================
# 기관 → UI 카테고리
# ======================================================
AGENCY_TO_CATEGORY = {
    0: "경찰·검찰",
    6: "경찰·검찰",
    13: "경찰·검찰",

    1: "교통",

    2: "산업·통상",  # 고용노동부
    7: "산업·통상",
    10: "산업·통상",
    14: "산업·통상",
    16: "산업·통상",
    17: "산업·통상",

    12: "환경",

    9: "보건",
    5: "보건",

    15: "교육",

    8: "행정·안전",  # 행정안전부
    18: "행정·안전", # 소방청
    19: "행정·안전",
    4: "행정·안전",  # 국민권익위
    3: "행정·안전",  # 국방부
    11: "행정·안전",

    20: "기타",
}

import re

def contains_keyword_ignore_space(text: str, keyword: str) -> bool:
    """
    띄어쓰기를 무시하고 keyword 포함 여부 판단
    (원본 text는 변경하지 않음)
    """
    normalized_text = re.sub(r"\s+", "", text)
    normalized_keyword = re.sub(r"\s+", "", keyword)
    return normalized_keyword in normalized_text


# ======================================================
# 민원 분류 메인 함수
# ======================================================
def classify_complaint(user_query: str) -> dict:
    """
    사용자 민원 문장을 입력받아
    RAG 검색 결과를 기반으로 소관 기관을 최종 판단한다.
    """

    if contains_keyword_ignore_space(user_query, "주정차") and (
        contains_keyword_ignore_space(user_query, "불법") or
        any(
            contains_keyword_ignore_space(user_query, k)
            for k in ["단속", "신고", "조치"]
        )
    ):
        return {
            "agency_code": AGENCY_CODES["경찰청"],
            "agency_name": "경찰청",
            "category": AGENCY_TO_CATEGORY[AGENCY_CODES["경찰청"]],
            "confidence": 1.0,
            "reasoning": "주정차 단속·불법 주정차는 명확한 교통질서 위반 사안이므로, RAG 검색을 거치지 않고 경찰청 소관으로 즉시 분류합니다. (Hard Rule 적용)",
            "sources": []
        }


    logger.info("=" * 60)
    logger.info("[RAG] Query received: %s", user_query)

    # 1. RAG 검색 수행
    results = ask(user_query, top_k=3)

    if not results:
        return {
            "agency_code": 20,
            "agency_name": "기타",
            "category": "기타",
            "confidence": 0.0,
            "reasoning": "관련 법령 검색 결과가 없습니다.",
            "sources": []
        }

    agency_scores = Counter()
    source_details = []

    # 1순위: 사용자 질의 핵심 키워드 
    query_hint_agency = "기타"
    for key, agency in KEYWORD_TO_AGENCY.items():
        if key in user_query:
            query_hint_agency = agency
            break
    
    # 질의에 명확한 의도가 있다면 기본 점수 부여 
    if query_hint_agency != "기타":
        agency_scores[query_hint_agency] += 3.0

    # 2. 검색 결과 해석
    for r in results:
        raw_source = unicodedata.normalize("NFC", r.get("source", ""))
        filename = os.path.basename(raw_source)
        rtype = r.get("type", "unknown")

        weight = 1.0

        if rtype == "vector":
            score_value = r.get("score", 0.0)
            weight += score_value 
            score_label = "COSINE"
        else:
            score_value = r.get("bm25_score", 0.0)
            weight += min(1.0, score_value / 10.0)
            score_label = "BM25"

        matched_agency = "기타"
        is_broad_law = False

        # 범용 법령 판별 (모든 민원의 근거가 될 수 있는 법)
        BROAD_LAWS = ["지방자치법", "재난 및 안전관리 기본법", "행정절차법", "행정업무의 효율적 운영", "민원 처리"]
        for broad in BROAD_LAWS:
            if broad in filename:
                is_broad_law = True
                break

        # 파일명 기반 매칭
        for key, agency in KEYWORD_TO_AGENCY.items():
            if key in filename:
                matched_agency = agency
                weight += 0.5 
                break

        # 본문 기반 매칭
        if matched_agency == "기타":
            text_snippet = r.get("text", "")[:500]
            for key, agency in KEYWORD_TO_AGENCY.items():
                if key in text_snippet:
                    matched_agency = agency
                    break

        # [핵심 로직] 범용 법령이고 질의 힌트가 있다면, 힌트 기관으로 매칭 시도
        if is_broad_law:
            if query_hint_agency != "기타":
                matched_agency = query_hint_agency
                # 범용 법령의 영향력을 약간 낮춤
                weight *= 0.8
            else:
                matched_agency = "행정안전부" # 힌트가 없으면 기본값

        # 최종 가중치 합산
        if matched_agency == "기타" and query_hint_agency != "기타":
            matched_agency = query_hint_agency
            weight += 0.2
        elif matched_agency != "기타" and matched_agency == query_hint_agency:
            # 검색 결과와 질의 키워드가 일치하면 추가 보너스
            weight += 1.0

        agency_scores[matched_agency] += weight
        source_details.append(f"{filename} ({score_label}: {score_value:.4f})")

    # 3. 최종 기관 결정
    best_agency, best_score = agency_scores.most_common(1)[0]
    total_score = sum(agency_scores.values())

    agency_code = AGENCY_CODES.get(best_agency, 20)
    category = AGENCY_TO_CATEGORY.get(agency_code, "기타")
    confidence = round(best_score / total_score, 2) if total_score else 0.0

    reasoning = (
        f"검색된 법령 근거 중 가장 높은 점수가 "
        f"'{best_agency}' 소관으로 판단되었습니다."
    )

    top_source_text = results[0].get("text", "내용 없음")[:150] + "..." if results else "없음"

    logger.info("-" * 40)
    logger.info("[ANALYSIS REPORT]")
    logger.info(f"1. 입력 텍스트: {user_query}")
    logger.info(f"2. 민원 유형: {category}")
    logger.info(f"3. 판단 기관: {best_agency}")
    logger.info(f"4. 판단 근거: {reasoning}")
    logger.info(f"5. 관련 법령 개요: {top_source_text}")
    logger.info(f"6. 참조 소스: {', '.join(source_details[:2])}")
    logger.info("-" * 40)

    return {
        "agency_code": agency_code,
        "agency_name": best_agency,
        "category": category,
        "confidence": confidence,
        "reasoning": reasoning,
        "sources": source_details
    }