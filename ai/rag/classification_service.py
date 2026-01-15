"""
classification_service.py

===========================================================
RAG 기반 민원 분류(Classification Layer)
===========================================================

이 파일은 RAG 기반 민원 분류 시스템에서
`query.py`가 반환한 "법령 검색 결과"를 단순히 출력하는 것이 아니라,
그 결과를 행정 도메인 관점에서 재해석하여 실제 소관기관을 확정하는
분류 판단 레이어(Classification Layer)입니다.

-----------------------------------------------------------
1. 시스템 흐름(End-to-End Pipeline)
-----------------------------------------------------------

[User Complaint Text]
        |
        v
(query.py) Retrieval Layer
 - Vector Search(Milvus Embedding Search)
 - BM25 Search(Kiwi Tokenize + bm25_index.pkl)
 - RRF Hybrid Fusion(순위 기반 결합)
        |
        v
(classification_service.py) Decision / Classification Layer
 - 질의 핵심 키워드 기반 힌트 추출(Query Hint)
 - 검색 결과 문서 filename / 본문 snippet 키워드 매칭
 - 범용 법령 패널티 적용(행안부 과다 문제 방지)
 - 행안부 게이트(MOIS Guard)로 후보 제한
 - confidence / top1-top2 gap 기준 애매하면 기타
        |
        v
[Final Result]
 { agency_code, agency_name, category, confidence, reasoning, sources }

-----------------------------------------------------------
2. 이 파일의 핵심 목적(Why this layer exists)
-----------------------------------------------------------

RAG 검색 결과만으로 "기관"을 결정하면 다음 문제가 자주 발생합니다.

(1) 범용 법령 편향 문제
 - 지방자치법, 행정절차법 등은 거의 모든 민원에서 검색됩니다.
 - 따라서 이런 법령이 상위에 뜨면 행정안전부(행안부)가 과다하게 선택됩니다.

(2) 검색 점수 스케일 혼합 문제
 - Vector score와 BM25 score는 스케일이 달라 직접 합산하면 불안정합니다.
 - query.py에서 RRF로 순위 기반 융합을 했더라도,
   최종 기관 판정은 도메인 룰로 보정해야 정확도가 안정됩니다.

(3) 애매한 케이스의 오분류 문제
 - "불만", "문제", "신고합니다" 같은 표현만 있는 질의는
   특정 기관으로 단정하기 어렵습니다.
 - 이 경우 오분류 대신 '기타'로 보내는 fallback 로직이 필요합니다.

따라서 classification_service.py는 Retrieval 결과를
"행정기관 분류 문제"로 변환하는 규칙 기반 Decision Layer 역할을 수행합니다.

-----------------------------------------------------------
3. 구현 전략(Design Philosophy)
-----------------------------------------------------------

본 구현은 ML 모델로 직접 기관을 분류하는 방식이 아니라,
"검색된 법령(근거)" + "질의 키워드(힌트)"를 사용하여
기관별 점수(agency_scores)를 누적하고 가장 높은 기관을 선택하는 구조입니다.

- 장점:
  - 설명가능성(Explainability) 높음
  - 룰 추가/수정 빠름
  - 데이터 부족 상황에서도 안정적으로 동작

- 단점:
  - KEYWORD_TO_AGENCY 품질 의존
  - 문서 소스(법령) 품질/범용법 비율에 민감

-----------------------------------------------------------
4. 개선 포인트: 행안부 과다 방지(Over-Prediction Prevention)
-----------------------------------------------------------

행정안전부는 범용 법령의 검색 빈도 때문에 자주 1등으로 뜰 수 있어,
아래 3중 방어 장치를 둡니다.

(1) 범용 법령 패널티(BROAD_LAW_PENALTY)
 - 지방자치법/행정절차법 등 범용 법령이 뜨면
   해당 결과의 weight를 강하게 낮춥니다.

(2) 행안부 게이트(MOIS Guard)
 - 사용자의 질의에 "행안부 문맥"이 명확하지 않다면,
   행안부 점수를 상한(MOIS_SCORE_CAP_WHEN_NO_CONTEXT)으로 제한합니다.
 - 즉, "행안부로 쏠릴만한 명시적 증거"가 없으면
   행안부가 절대 최종 1등이 되지 못하게 차단합니다.

(3) 애매하면 기타 컷오프(Fallback to ETC)
 - confidence가 낮거나 top1/top2 점수 차이가 작으면
   오분류를 방지하기 위해 '기타'로 분류합니다.
"""

import os
import re
import logging
import unicodedata
from collections import Counter
from typing import Dict, List, Tuple

from query import ask

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ======================================================
# 키워드 → 기관 매핑 (보조 힌트용)
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
    "소화기": "소방청",
    "소화전": "소방청",

    # 보건복지부
    "감염병": "보건복지부",
    "전염병": "보건복지부",
    "보건": "보건복지부",

    # 식약처(식품 관련)
    "식품": "식품의약품안전처",
    "위생": "식품의약품안전처",
    "이물": "식품의약품안전처",
    "이물질": "식품의약품안전처",
    "벌레": "식품의약품안전처",
    "곰팡이": "식품의약품안전처",
    "상했": "식품의약품안전처",
    "변질": "식품의약품안전처",
    "유통기한": "식품의약품안전처",
    "식중독": "식품의약품안전처",
    "원산지": "식품의약품안전처",
    "알레르기": "식품의약품안전처",
    "리콜": "식품의약품안전처",
    "회수": "식품의약품안전처",

    # 고용노동부
    "근로": "고용노동부",
    "노동": "고용노동부",
    "임금": "고용노동부",
    "체불": "고용노동부",
    "해고": "고용노동부",
    "월급": "고용노동부",
    "급여": "고용노동부",
    "돈을 안줘": "고용노동부",
    "돈을 안 줘": "고용노동부",
    "돈을 못받": "고용노동부",
    "급여가 밀": "고용노동부",
    "월급이 밀": "고용노동부",

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
    "경찰청": 18,
    "국토교통부": 19,
    "고용노동부": 20,
    "국방부": 21,
    "국민권익위원회": 22,
    "식품의약품안전처": 23,
    "대검찰청": 24,
    "기획재정부": 25,
    "행정안전부": 26,
    "보건복지부": 27,
    "과학기술정보통신부": 28,
    "국세청": 29,
    "기후에너지환경부": 30,
    "법무부": 31,
    "공정거래위원회": 32,
    "교육부": 33,
    "해양수산부": 34,
    "농림축산식품부": 35,
    "소방청": 36,
    "인사혁신처": 37,
    "기타": 38,
}


# ======================================================
# 기관 → UI 카테고리
# ======================================================
AGENCY_TO_CATEGORY = {
    18: "경찰·검찰",
    24: "경찰·검찰",
    31: "경찰·검찰",

    19: "교통",

    20: "산업·통상",
    25: "산업·통상",
    28: "산업·통상",
    32: "산업·통상",
    34: "산업·통상",
    35: "산업·통상",

    30: "환경",

    27: "보건",
    23: "보건",

    33: "교육",

    26: "행정·안전",
    36: "행정·안전",
    37: "행정·안전",
    22: "행정·안전",
    21: "행정·안전",
    29: "행정·안전",

    38: "기타",
}


# ======================================================
# 정책/튜닝 파라미터
# ======================================================
# 범용 법령: 너무 자주 뜨므로 기관 판단 근거로 약하게 반영(감점)
BROAD_LAWS = [
    "지방자치법",
    "재난 및 안전관리 기본법",
    "행정절차법",
    "행정업무의 효율적 운영",
    "민원 처리",
]

# 범용 법령 감점 계수 (기존 0.8은 약해서 더 강하게)
BROAD_LAW_PENALTY = 0.35  # 0.35~0.5 권장 (0.35면 꽤 강하게 눌림)

# 행안부 게이트: 질의에 아래 문맥이 없으면 행안부는 점수 상한/감점
MOIS_CONTEXT_TERMS = [
    # 재난/안전/민방위/재난문자/대피
    "재난", "안전", "재난문자", "대피", "침수", "호우", "폭설", "지진", "산사태",
    "민방위", "비상대피", "재난지원금",

    # 주민/행정서비스
    "주민등록", "전입", "전입신고", "인감", "주민센터", "행정복지센터",
    "정부24", "행정서비스", "행정절차", "민원처리", "처리기한", "담당부서",
]

# 행안부 과다 방지용 상한(게이트 실패 시 행안부 점수는 이 이상 못 올라가게)
MOIS_SCORE_CAP_WHEN_NO_CONTEXT = 0.8

# 애매하면 기타로 떨어뜨리는 안전장치
CONFIDENCE_FLOOR = 0.45          # confidence가 이보다 낮으면 기타
TOP1_TOP2_GAP_FLOOR = 0.40       # (top1 - top2) 차이가 이보다 작으면 기타


# ======================================================
# 유틸
# ======================================================
def contains_keyword_ignore_space(text: str, keyword: str) -> bool:
    """
    띄어쓰기를 무시하고 keyword 포함 여부 판단
    
      목적:
    - 사용자가 불법주정차를 "불법 주정 차", "주 정 차" 등으로 입력해도
      정확히 매칭되도록 하기 위한 전처리 유틸입니다.

    동작:
    - text와 keyword에서 공백(\s+) 제거 후 substring 포함 여부 판단

    예:
    - text="불법 주정차 신고합니다", keyword="주정차" -> True
    - text="주 정 차 단속 요청", keyword="주정차" -> True
    
    """
    normalized_text = re.sub(r"\s+", "", text)
    normalized_keyword = re.sub(r"\s+", "", keyword)
    return normalized_keyword in normalized_text


def _has_any_term(text: str, terms: List[str]) -> bool:
    """
    주어진 terms 중 하나라도 text에 포함되어 있는지 확인합니다.

    Args:
        text: 검사 대상 텍스트
        terms: 포함 여부를 확인할 키워드 리스트

    Returns:
        terms 중 하나라도 text에 포함되어 있으면 True, 아니면 False

    예:
        _has_any_term("불법 주정차 신고합니다", ["주정차", "단속"]) -> True
        _has_any_term("도로 파손 민원", ["주정차", "단속"]) -> False
    """
    return any(t in text for t in terms)


def _infer_query_hint_agency(user_query: str) -> str:
    """
    [Query Hint Inference]
    사용자 질의(user_query)만 보고 1차적으로 "기관 힌트"를 추정합니다.

    핵심 개념:
    - query.py Retrieval 결과는 '법령 텍스트' 위주이며,
      질의에서 직접 드러나는 키워드가 분류에 더 강한 근거가 될 수 있습니다.
    - 따라서 KEYWORD_TO_AGENCY 매핑을 사용해 질의 기반 힌트를 먼저 확보합니다.

    로직:
    1) KEYWORD_TO_AGENCY 사전에 정의된 키워드가 user_query에 포함되면
       해당 기관을 query_hint로 설정
    2) 다만 '표시/성분/불량/부정' 같은 단어는 단독으로는 식약처로 오분류될 수 있으므로
       식품 문맥(먹/빵/식당/마트/제품 등)이 동시에 존재하는 경우에만 식약처로 강화

    목적:
    - Retrieval 결과가 범용 법령 위주로 뜰 때도,
      질의 자체 힌트를 기반으로 기관 분류 방향성을 확보하기 위함
    """
    # (B) 조건부 문맥 규칙: 약한 단어는 식품 문맥이 있을 때만 식약처로 강화
    WEAK_FOOD_TERMS = ["표시", "성분", "불량", "부정", "첨가물"]
    FOOD_CONTEXT_TERMS = [
        "먹", "음식", "빵", "과자", "식당", "유통", "원산지", "제조", "판매",
        "마트", "구매", "제품", "식품", "간식", "음료", "포장", "라벨",
    ]

    has_weak_food_term = _has_any_term(user_query, WEAK_FOOD_TERMS)
    has_food_context = _has_any_term(user_query, FOOD_CONTEXT_TERMS)

    # 기본: KEYWORD_TO_AGENCY에서 첫 매칭을 힌트로 채택
    query_hint = "기타"
    for key, agency in KEYWORD_TO_AGENCY.items():
        if key in user_query:
            query_hint = agency
            break

    # 약한 식품 단어가 있는데 식품 문맥이 있는 경우만 식약처 강화
    if has_weak_food_term and has_food_context:
        query_hint = "식품의약품안전처"

    return query_hint


def _apply_mois_guard(user_query: str, agency_scores: Counter) -> None:
    """
    행정안전부(행안부)가 과다하게 최종 기관으로 선택되는 문제를 방지하기 위한 게이트 함수입니다.

    문제 배경:
    - 지방자치법, 행정절차법, 민원처리 관련 법령은 어떤 민원에서도 등장할 수 있어
      검색 결과만으로 판단하면 행안부가 1등으로 과다 출력되는 문제가 발생합니다.

    해결 전략:
    - user_query에 MOIS_CONTEXT_TERMS(재난/안전/주민등록/정부24/전입신고 등)
      "명시적 행안부 문맥"이 존재하지 않는다면,
      행안부 점수를 상한(MOIS_SCORE_CAP_WHEN_NO_CONTEXT)으로 제한합니다.

    결과:
    - 행안부 관련 민원이 아닌데도 행안부가 떠버리는 오분류를 강하게 억제합니다.
    """
    has_mois_context = _has_any_term(user_query, MOIS_CONTEXT_TERMS)

    if not has_mois_context:
        # 이미 행안부 점수가 높게 쌓였다면 상한으로 컷
        if agency_scores.get("행정안전부", 0.0) > MOIS_SCORE_CAP_WHEN_NO_CONTEXT:
            agency_scores["행정안전부"] = MOIS_SCORE_CAP_WHEN_NO_CONTEXT


def _decide_with_fallback_to_other_or_etc(agency_scores: Counter) -> Tuple[str, float, float]:
    """
    기관 점수(agency_scores)를 기반으로 최종 기관을 결정합니다.

    결정 기준:
    - 기본: 점수가 가장 높은 기관(best_agency)을 선택
    - 단, 분류가 애매한 경우(근거 부족/동점/분산) 오분류를 줄이기 위해 '기타'로 fallback

    애매한 경우 판정:
    1) confidence < CONFIDENCE_FLOOR
       - best_score / total_score 기반 confidence가 너무 낮으면 근거가 분산된 상태로 판단

    2) (top1 - top2) < TOP1_TOP2_GAP_FLOOR
       - 1등/2등 격차가 작으면 기관 단정 불가로 판단

    Returns:
    - best_agency: 최종 기관명(혹은 '기타')
    - best_score: 1등 점수(디버깅용)
    - confidence: confidence 값(0~1 스케일)
    """
    if not agency_scores:
        return "기타", 0.0, 0.0

    ordered = agency_scores.most_common()
    best_agency, best_score = ordered[0]
    total_score = sum(agency_scores.values())
    confidence = round(best_score / total_score, 2) if total_score else 0.0

    # 1등-2등 차이
    second_score = ordered[1][1] if len(ordered) > 1 else 0.0
    gap = float(best_score - second_score)

    # 애매하면 기타
    if confidence < CONFIDENCE_FLOOR or gap < TOP1_TOP2_GAP_FLOOR:
        return "기타", best_score, confidence

    return best_agency, best_score, confidence


# ======================================================
# 민원 분류 메인 함수
# ======================================================
def classify_complaint(user_query: str) -> dict:
    """
    사용자 민원 문장을 입력받아
    RAG 검색 결과를 기반으로 소관 기관을 최종 판단한다.

    로직 흐름:
    1. Hard Rule: 불법주정차 → 경찰청
    2. RAG 검색 및 점수 초기화
    3. Query Hint 추정 (질의 기반 1차 힌트)
    4. 법령 점수 가중치 적용
    5. 행안부 과다 방지 게이트
    6. 최종 기관 결정 (애매하면 기타)
    """

    # ---------------------------
    # Hard Rule: 불법주정차(교통질서 위반) → 경찰청
    # ---------------------------
    if contains_keyword_ignore_space(user_query, "주정차") and (
        contains_keyword_ignore_space(user_query, "불법")
        or any(contains_keyword_ignore_space(user_query, k) for k in ["단속", "신고", "조치"])
    ):
        return {
            "agency_code": AGENCY_CODES["경찰청"],
            "agency_name": "경찰청",
            "category": AGENCY_TO_CATEGORY[AGENCY_CODES["경찰청"]],
            "confidence": 1.0,
            "reasoning": "주정차 단속·불법 주정차는 명확한 교통질서 위반 사안이므로, RAG 검색을 거치지 않고 경찰청 소관으로 즉시 분류합니다. (Hard Rule 적용)",
            "sources": [],
        }

    logger.info("=" * 60)
    logger.info("[RAG] Query received: %s", user_query)

    # 1) RAG 검색
    results = ask(user_query, top_k=3)

    if not results:
        return {
            "agency_code": AGENCY_CODES["기타"],
            "agency_name": "기타",
            "category": "기타",
            "confidence": 0.0,
            "reasoning": "관련 법령 검색 결과가 없습니다.",
            "sources": [],
        }

    agency_scores = Counter()
    source_details: List[str] = []

    # 2) 질의 힌트 기관
    query_hint_agency = _infer_query_hint_agency(user_query)

    # 질의에 명확한 의도가 있다면 기본 점수 부여
    if query_hint_agency != "기타":
        agency_scores[query_hint_agency] += 3.0

    # 3) 검색 결과 해석
    for r in results:
        raw_source = unicodedata.normalize("NFC", r.get("source", ""))
        filename = os.path.basename(raw_source)
        rtype = r.get("type", "unknown")

        weight = 1.0
        score_value = float(r.get("score", 0.0))

        if rtype == "vector":
            # query.py에서 score는 정규화된 "클수록 좋음" 스코어라고 가정
            weight += score_value
            score_label = "VECTOR"
        else:
            # BM25는 점수 스케일이 커질 수 있어 완만히 반영
            weight += min(1.0, score_value / 10.0)
            score_label = "BM25"

        matched_agency = "기타"

        # (1) 범용 법령 판별
        is_broad_law = any(broad in filename for broad in BROAD_LAWS)

        # (2) 파일명 기반 매칭
        for key, agency in KEYWORD_TO_AGENCY.items():
            if key in filename:
                matched_agency = agency
                weight += 0.5
                break

        # (3) 본문 기반 매칭
        if matched_agency == "기타":
            text_snippet = (r.get("text", "") or "")[:700]
            for key, agency in KEYWORD_TO_AGENCY.items():
                if key in text_snippet:
                    matched_agency = agency
                    break

        # (4) 범용 법령 처리: 힌트가 있으면 힌트 쪽으로 보내되, weight를 강하게 감점
        if is_broad_law:
            if query_hint_agency != "기타":
                matched_agency = query_hint_agency
            # 범용법은 기관 근거로 약하므로 강하게 감점
            weight *= BROAD_LAW_PENALTY

        # (5) 힌트 보정
        if matched_agency == "기타" and query_hint_agency != "기타":
            matched_agency = query_hint_agency
            weight += 0.2
        elif matched_agency != "기타" and matched_agency == query_hint_agency:
            weight += 1.0  # 검색결과와 질의 힌트 일치 보너스

        # (6) 최종 합산
        agency_scores[matched_agency] += weight
        source_details.append(f"{filename} ({score_label}: {score_value:.4f})")

    # 4) 행안부 과다 방지 게이트 적용(문맥 없으면 점수 상한)
    _apply_mois_guard(user_query, agency_scores)

    # 5) 최종 기관 결정 + 애매하면 기타 컷오프
    best_agency, best_score, confidence = _decide_with_fallback_to_other_or_etc(agency_scores)

    agency_code = AGENCY_CODES.get(best_agency, AGENCY_CODES["기타"])
    category = AGENCY_TO_CATEGORY.get(agency_code, "기타")

    reasoning = (
        f"검색 결과 및 질의 힌트 기반 점수 합산 결과, '{best_agency}'가(이) 가장 적합한 소관 기관으로 판단되었습니다."
        if best_agency != "기타"
        else "근거가 분산되거나(애매함) 범용 법령 비중이 높아 특정 기관으로 단정하기 어려워 '기타'로 분류했습니다."
    )

    top_source_text = (results[0].get("text", "내용 없음") or "")[:150] + "..."

    logger.info("-" * 40)
    logger.info("[ANALYSIS REPORT]")
    logger.info("1. 입력 텍스트: %s", user_query)
    logger.info("2. 질의 힌트 기관: %s", query_hint_agency)
    logger.info("3. 점수 상위: %s", agency_scores.most_common(5))
    logger.info("4. 최종 기관: %s", best_agency)
    logger.info("5. confidence: %s", confidence)
    logger.info("6. 관련 법령 개요: %s", top_source_text)
    logger.info("7. 참조 소스(상위): %s", ", ".join(source_details[:3]))
    logger.info("-" * 40)

    return {
        "agency_code": agency_code,
        "agency_name": best_agency,
        "category": category,
        "confidence": confidence,
        "reasoning": reasoning,
        "sources": source_details,
    }