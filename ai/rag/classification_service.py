import os
import logging
import unicodedata
from collections import Counter
from query import ask

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =========================
# 키워드 → 기관 매핑 (fallback + source 보정용)
# =========================
KEYWORD_TO_AGENCY = {
    "도로교통": "경찰청",
    "불법주차": "경찰청",
    "주차": "국토교통부",
    "환경": "기후에너지환경부",
    "폐수": "기후에너지환경부",
    "하천": "기후에너지환경부",
    "쓰레기": "기후에너지환경부",
    "개인정보": "개인정보보호위원회",
    "민원": "국민권익위원회",
    "형법": "법무부",
    "근로": "고용노동부",
    "노동": "고용노동부",
}


# =========================
# 기관 코드 정의 (절대 기준)
# =========================
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

# =========================
# 기관 → UI 유형 매핑
# =========================
AGENCY_TO_CATEGORY = {
    0: "경찰·검찰",
    6: "경찰·검찰",
    13: "경찰·검찰",

    1: "교통",
    8: "행정·안전",
    18: "행정·안전",
    19: "행정·안전",
    4: "행정·안전",

    2: "산업·통상",
    7: "산업·통상",
    10: "산업·통상",
    14: "산업·통상",
    16: "산업·통상",
    17: "산업·통상",

    12: "환경",
    9: "보건",
    5: "보건",

    15: "교육",
    3: "행정·안전",
    11: "행정·안전",

    20: "기타"
}


# =========================
# 핵심 분류 함수
# =========================
def classify_complaint(user_query: str) -> dict:
    logger.info("=" * 60)
    logger.info("[RAG] Query received: %s", user_query)

    results = ask(user_query, top_k=3)

    if not results:
        return {
            "agency_code": 20,
            "agency_name": "기타",
            "category": "기타",
            "confidence": 0.0,
            "reasoning": "관련 법령을 찾을 수 없습니다.",
            "sources": []
        }

    agency_counts = Counter()
    source_details = []

    logger.info("[RAG] Evidence documents:")

    for r in results:
        raw_source = unicodedata.normalize("NFC", r.get("source", ""))
        filename = os.path.basename(raw_source)

        score = r.get("score", 0.0)
        rtype = r.get("type", "unknown")
        score_label = "Vector" if rtype == "vector" else rtype.upper()

        logger.info(" - %s | %s %.2f", filename, score_label, score)

        matched_agency = "기타"
        for key, agency in KEYWORD_TO_AGENCY.items():
            if key in raw_source:
                matched_agency = agency
                break

        agency_counts[matched_agency] += 1
        source_details.append(f"{filename} ({score_label}: {score:.2f})")

    best_agency, best_count = agency_counts.most_common(1)[0]
    total_docs = len(results)

    agency_code = AGENCY_CODES.get(best_agency, 20)
    category = AGENCY_TO_CATEGORY.get(agency_code, "기타")
    confidence = round(best_count / total_docs, 2)

    reasoning = (
        f"검색된 연관 법령 {total_docs}건 중 "
        f"{best_count}건이 '{best_agency}' 소관으로 식별됨."
    )

    logger.info("[RAG] Final decision: %s (%d)", best_agency, agency_code)
    logger.info("[RAG] Confidence: %.2f", confidence)
    logger.info("=" * 60)

    return {
        "agency_code": agency_code,
        "agency_name": best_agency,
        "category": category,
        "confidence": confidence,
        "reasoning": reasoning,
        "sources": source_details
    }