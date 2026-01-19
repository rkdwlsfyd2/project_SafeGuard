"""
rag/classification_service.py
: RAG 기반 민원 분류 서비스

[역할]
- 검색 시스템(query.py)의 결과를 받아 최종 소관 기관을 결정
- 법령 검색 결과와 질의어의 힌트를 종합하여 기관 점수를 계산
- 범용 법령으로 인한 오분류(행안부 과다) 방지 등 보정 로직 적용

[주요 기능]
- classify_complaint: 사용자 질의를 입력받아 기관, 신뢰도, 근거 등을 반환
- _infer_query_hint_agency: 질의어 자체에서 기관 힌트 추출
- _apply_mois_guard: 행정안전부 과다 분류 방지 필터링

[시스템 흐름]
1. 사용자 질의 입력
2. Hard Rule 체크 (예: 불법주정차 -> 경찰청)
3. RAG 검색 (query.py) 및 질의 힌트 추출
4. 기관별 점수 합산 (검색 결과 가중치 + 힌트 보너스)
5. 행안부 게이트 적용 (문맥 없으면 점수 제한)
6. 최종 기관 결정 (점수 1위 or 애매하면 기타)

[파일의 핵심목적]
- 단순 검색 결과를 넘어, 행정 도메인 특성(범용법, 키워드 등)을 반영한 '분류 판단(Decision Making)' 수행
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
    # 경찰청 / 교통 범칙금 관련
    "도로교통": "경찰청",
    "교통위반": "경찰청",
    "불법주정차": "경찰청",
    "신호위반": "경찰청",
    "과속": "경찰청",
    "음주운전": "경찰청",
    "주차위반": "경찰청",
    "흉기":"경찰청",
    "폭행":"경찰청",
    "폭행사건":"경찰청",
    "마약":"경찰청",
    "마약범죄":"경찰청",


    # 국토교통부 (교통시설·건설·주택)
    "주차장": "국토교통부",
    "도로": "국토교통부",
    "노면": "국토교통부",
    "도로 파손": "국토교통부",
    "도로 파손 신고": "국토교통부",
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
    "도로파손": "국토교통부",
    "도로포장": "국토교통부",
    "도로포장불량": "국토교통부",
    "가로등":"국토교통부",
    "가로등 설치":"국토교통부",
    "가로등 설치 신청":"국토교통부",
    "아스팔트": "국토교통부",
    "안전관리": "국토교통부",
    "안전펜스": "국토교통부",
    "안전표지": "국토교통부",
    "현장안전": "국토교통부",
    "버스": "국토교통부",
    "정류장": "국토교통부",
    "노선": "국토교통부",
    "배차": "국토교통부",
    "대중교통": "국토교통부",
    "어두워": "국토교통부",
    "어둡": "국토교통부",
    "조명": "국토교통부",
    "지뢰밭": "국토교통부",
    "파였": "국토교통부",
    "균열": "국토교통부",
    "상태가 이상": "국토교통부",
    "불친절": "국토교통부",
    "난폭": "국토교통부",
    "공원": "국토교통부",
    "벤치": "국토교통부",
    "운동기구": "국토교통부",
    "붙이": "국토교통부",
    "광고물": "국토교통부",
    "전단지": "국토교통부",
    "보행":"국토교통부",
    "보행시설":"국토교통부",
    


    # 기후에너지환경부 (환경오염·위생)
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
    "광공해": "기후에너지환경부",
    "광공해 신고": "기후에너지환경부",
    "재활용품": "기후에너지환경부",
    "시끄러": "기후에너지환경부",
    "확성기": "기후에너지환경부",
    "소음이": "기후에너지환경부",
    "맨홀": "기후에너지환경부",
    "더러워": "기후에너지환경부",
    "지저분": "기후에너지환경부",
    "소음": "기후에너지환경부",
    "진동": "기후에너지환경부",
    "공사소리":"기후에너지환경부",
    "공사 소리":"기후에너지환경부",
    "공사 소음":"기후에너지환경부",
    "공사 진동":"기후에너지환경부",
    "드릴" : "기후에너지환경부",
    "공사" : "기후에너지환경부",
    "공사 시간" : "기후에너지환경부",
    

    # 소방청
    "소방": "소방청",
    "화재": "소방청",
    "소화기": "소방청",
    "소화전": "소방청",
    "소방차": "소방청",
    "소방시설":"소방청",
    "소방대원":"소방청",

    # 기후에너지환경부 (추가)
    "전기차": "기후에너지환경부",
    "충전소": "기후에너지환경부",
    "미세먼지": "기후에너지환경부",
    "비산먼지": "기후에너지환경부",

    # 보건복지부
    "감염병": "보건복지부",
    "전염병": "보건복지부",
    "보건": "보건복지부",
    "흡연": "보건복지부",
    "금연": "보건복지부",
    "간접흡연": "보건복지부",
    "놀이터 흡연": "보건복지부",
    "노인일자리": "보건복지부",
    "기초연금": "보건복지부",
    "보육": "보건복지부",

    # 식약처 (식품안전)
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
    "음식물재사용": "식품의약품안전처",
    "음식물 재사용": "식품의약품안전처",
    "음식 재사용": "식품의약품안전처",
    "과당": "식품의약품안전처",
    "탄수화물":"식품의약품안전처",
    "당류":"식품의약품안전처",
    "당류 함량":"식품의약품안전처",
    "지방 함량":"식품의약품안전처",
    "첨가물":"식품의약품안전처",
    "식품첨가물":"식품의약품안전처",
    "식품첨가물 함량":"식품의약품안전처",
    


    # 고용노동부 (임금·근로)
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
    "임금체불": "고용노동부",
    "무급휴직": "고용노동부",
    "무급휴가": "고용노동부",
    "무급휴업": "고용노동부",
    "연차":"고용노동부",
    "연차미사용수당":"고용노동부",
    "연금":"고용노동부",
    "퇴직금":"고용노동부",
    "퇴직금미지급":"고용노동부",
    "정년":"고용노동부",
    "정년퇴직":"고용노동부",
    "정년퇴직금":"고용노동부",
    "정년 퇴직금미지급":"고용노동부",
    "정년 퇴직금 미지급":"고용노동부",
    "회사":"고용노동부",
    "근로계약서":"고용노동부",


    # 행정
    "민원": "국민권익위원회",
    "청원": "국민권익위원회",

    # 행안부
    "주민등록": "행정안전부",
    "전입": "행정안전부",
    "등본": "행정안전부",
    "초본": "행정안전부",
    "민방위": "행정안전부",
    "재난": "행정안전부",
    "지진": "행정안전부",
    "대피": "행정안전부",
    "안전신문고": "행정안전부",
    "지급자치": "행정안전부",
    "주민센터": "행정안전부",
    "행정복지센터": "행정안전부",
    "동사무소": "행정안전부",
    "공공시설": "행정안전부",
    "체육시설": "행정안전부",
    "지방자치": "행정안전부",
    "현수막": "행정안전부",
    "불법현수막": "행정안전부",
    "무더위쉼터": "행정안전부",
    "무더위 쉼터": "행정안전부",
    "그늘막": "행정안전부",
    "주민참여예산": "행정안전부",

    # 교육
    "학교": "교육부",
    "교육": "교육부",
    "학폭": "교육부",
    "학교폭력": "교육부",
    "체벌": "교육부",
    "선생님": "교육부",
    "교사": "교육부",
    "교원": "교육부",
    "학교 선생님": "교육부",
    "학교선생님": "교육부",
    "학생": "교육부",
    "학폭위": "교육부",
    "학교폭력대책심의위원회": "교육부",
    "맞짱": "교육부",
    "싸움": "교육부",
    "패싸움": "교육부",
    "담임": "교육부",
    "담임선생님": "교육부",
    "교육과정": "교육부",
    "학사일정": "교육부",
    "왕따": "교육부",
    "따돌림": "교육부",




    # 국방부
    "군대": "국방부",
    "군인": "국방부",
    "수류탄": "국방부",
    "군사기밀": "국방부",
    "군사기밀누설": "국방부",
    "군사기밀누설죄": "국방부",
    "간첩": "국방부",
    "탈영": "국방부",
    "예비군": "국방부",
    "훈련소": "국방부",
    "입영": "국방부",
    "입대": "국방부",
    "사격장": "국방부",


    # 공정거래위원회 (소비자 피해·불공정)
    "환불": "공정거래위원회",
    "반품": "공정거래위원회",
    "위약금": "공정거래위원회",
    "허위광고": "공정거래위원회",
    "과장광고": "공정거래위원회",
    "리콜": "공정거래위원회", 
    "할부": "공정거래위원회",
    "담합": "공정거래위원회",
    "가맹점": "공정거래위원회",
    "대리점": "공정거래위원회",
    "하도급": "공정거래위원회",

    # 국세청 (세금·현금영수증)
    "세금": "국세청",
    "현금영수증": "국세청",
    "신용카드 거부": "국세청",
    "카드거부": "국세청",
    "연말정산": "국세청",
    "탈세": "국세청",
    "세무조사": "국세청",
    "종합소득세": "국세청",
    "부가가치세": "국세청",
    "사업자등록": "국세청",
    "계산서": "국세청",

    # 과학기술정보통신부 (통신·우편)
    "휴대폰": "과학기술정보통신부",
    "통신비": "과학기술정보통신부",
    "요금폭탄": "과학기술정보통신부",
    "5G": "과학기술정보통신부",
    "LTE": "과학기술정보통신부",
    "인터넷해지": "과학기술정보통신부",
    "와이파이": "과학기술정보통신부",
    "WIFI": "과학기술정보통신부",
    "무선인터넷": "과학기술정보통신부",
    "통신장애": "과학기술정보통신부",
    "우체국": "과학기술정보통신부",
    "등기": "과학기술정보통신부",
    "택배": "과학기술정보통신부", 
    "통신사": "과학기술정보통신부",
    "인터넷": "과학기술정보통신부",
    "데이터": "과학기술정보통신부",
    "데이터 속도": "과학기술정보통신부",
    "웹사이트": "과학기술정보통신부",
    "전파": "과학기술정보통신부",
    "중계기": "과학기술정보통신부",
    "단말기": "과학기술정보통신부",
    "통신품질": "과학기술정보통신부",
    "모뎀": "과학기술정보통신부",

    # 보건복지부 
    "어린이집": "보건복지부",
    "기초생활수급": "보건복지부",
    "수급자": "보건복지부",
    "장애인": "보건복지부",
    "국민연금": "보건복지부",
    "건강보험": "보건복지부",
    "의료급여": "보건복지부",
    "노인": "보건복지부",
    "요양병원": "보건복지부",
    "아동수당": "보건복지부",
    "흡연": "보건복지부",
    "간접흡연" : "보건복지부",


    # 대검찰청 / 법무부
    "검찰": "대검찰청",
    "검사": "대검찰청",
    "기소": "대검찰청",
    "교도소": "법무부",
    "구치소": "법무부",
    "가석방": "법무부",
    "보호관찰": "법무부",
    "전자발찌": "법무부",

    "다문화": "보건복지부",

    # 농림축산식품부
    "동물보호": "농림축산식품부",
    "유기견": "농림축산식품부",
    "길고양이": "농림축산식품부",
    "개물림": "농림축산식품부",
    "농지": "농림축산식품부",
    "축산": "농림축산식품부",

    # 해양수산부
    "해수욕장": "해양수산부",
    "낚시": "해양수산부",
    "어업": "해양수산부",
    "방파제": "해양수산부",
}


# ======================================================
# 기관 코드 정의
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
# 기관 → UI 표시용 카테고리 매핑
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
# 범용 법령: 검색에 자주 잡히지만 특정 기관 판별력은 낮은 법령들
BROAD_LAWS = [
    "지방자치법",
    "재난 및 안전관리 기본법",
    "행정절차법",
    "행정업무의 효율적 운영",
    "민원 처리",
]

# 범용 법령 감점 계수 (낮을수록 강한 감점)
BROAD_LAW_PENALTY = 0.35

# 행안부 문맥 키워드 (이 단어들이 없으면 행안부 점수 제한)
MOIS_CONTEXT_TERMS = [
    "재난", "안전", "재난문자", "대피", "침수", "호우", "폭설", "지진", "산사태",
    "민방위", "비상대피", "재난지원금",
    "주민등록", "전입", "전입신고", "인감", "주민센터", "행정복지센터",
    "정부24", "행정서비스", "행정절차", "민원처리", "처리기한", "담당부서",
]

# 행안부 점수 상한치 (문맥 없을 시)
MOIS_SCORE_CAP_WHEN_NO_CONTEXT = 0.8

# 기타 분류 기준 (신뢰도 바닥값)
CONFIDENCE_FLOOR = 0.45
TOP1_TOP2_GAP_FLOOR = 0.40

# 최소 검색 품질 기준 (이 점수보다 낮으면 '노이즈'로 간주하여 무시)
MIN_VECTOR_SCORE_THRESHOLD = 0.63


# ======================================================
# 유틸리티 함수
# ======================================================
def contains_keyword_ignore_space(text: str, keyword: str) -> bool:
    """
    공백을 무시하고 키워드 포함 여부 확인
    예: '불법 주정차' ↔ '주정차'
    """
    normalized_text = re.sub(r"\s+", "", text)
    normalized_keyword = re.sub(r"\s+", "", keyword)
    return normalized_keyword in normalized_text


def _has_any_term(text: str, terms: List[str]) -> bool:
    """ 지정된 단어 리스트 중 하나라도 텍스트에 포함되는지 확인 """
    return any(t in text for t in terms)


def _infer_query_hint_agency(user_query: str) -> str:
    """
    [질의 힌트 추론]
    사용자 질의어 자체에서 키워드를 찾아 1차적으로 기관 힌트를 얻습니다.
    (법령 검색 전 단계)
    """
    # 일부 단어는 식품 문맥이 같이 있어야 식약처로 인정 (오분류 방지)
    WEAK_FOOD_TERMS = ["표시", "성분", "불량", "부정", "첨가물"]
    FOOD_CONTEXT_TERMS = [
        "먹", "음식", "빵", "과자", "식당", "유통", "원산지", "제조", "판매",
        "마트", "구매", "제품", "식품", "간식", "음료", "포장", "라벨",
    ]

    has_weak_food_term = _has_any_term(user_query, WEAK_FOOD_TERMS)
    has_food_context = _has_any_term(user_query, FOOD_CONTEXT_TERMS)

    # 기본: 키워드 매핑 확인
    query_hint = "기타"
    for key, agency in KEYWORD_TO_AGENCY.items():
        if key in user_query:
            query_hint = agency
            break

    # 조건부 보정: 약한 식품 키워드는 문맥이 있을 때만 적용
    if has_weak_food_term and has_food_context:
        query_hint = "식품의약품안전처"

    return query_hint


def _apply_mois_guard(user_query: str, agency_scores: Counter) -> None:
    """
    [행안부 게이트]
    행안부 관련 문맥이 없는 경우, 행안부 점수를 강제로 낮춰 쏠림 현상을 방지합니다.
    """
    has_mois_context = _has_any_term(user_query, MOIS_CONTEXT_TERMS)

    if not has_mois_context:
        # 상한치 적용
        if agency_scores.get("행정안전부", 0.0) > MOIS_SCORE_CAP_WHEN_NO_CONTEXT:
            agency_scores["행정안전부"] = MOIS_SCORE_CAP_WHEN_NO_CONTEXT


def _decide_with_fallback_to_other_or_etc(agency_scores: Counter) -> Tuple[str, float, float]:
    """
    [최종 결정]
    점수가 가장 높은 기관을 선택하되, 점수가 너무 낮거나 1,2위 격차가 작으면 '기타'로 분류합니다.
    """
    if not agency_scores:
        return "기타", 0.0, 0.0

    ordered = agency_scores.most_common()
    best_agency, best_score = ordered[0]
    total_score = sum(agency_scores.values())
    confidence = round(best_score / total_score, 2) if total_score else 0.0

    # 2위와의 점수 격차 확인
    second_score = ordered[1][1] if len(ordered) > 1 else 0.0
    gap = float(best_score - second_score)

    # 신뢰도가 낮거나 격차가 작으면 '기타' 반환
    if confidence < CONFIDENCE_FLOOR or gap < TOP1_TOP2_GAP_FLOOR:
        return "기타", best_score, confidence

    return best_agency, best_score, confidence


# ======================================================
# 민원 분류 메인 함수
# ======================================================
def classify_complaint(user_query: str) -> dict:
    """
    사용자 민원 내용을 분석하여 소관 기관을 분류합니다. (메인 엔트리)
    
    1. Hard Rule 체크 (불법주정차 등)
    2. RAG 검색 (유사 법령 찾기)
    3. 점수 계산 (검색결과 + 질의힌트 + 가중치)
    4. 보정 (행안부 게이트)
    5. 최종 결정
    """

    # 1. Hard Rule: 불법주정차는 무조건 경찰청
    if contains_keyword_ignore_space(user_query, "주정차") and (
        contains_keyword_ignore_space(user_query, "불법")
        or any(contains_keyword_ignore_space(user_query, k) for k in ["단속", "신고", "조치"])
    ):
        return {
            "agency_code": AGENCY_CODES["경찰청"],
            "agency_name": "경찰청",
            "category": AGENCY_TO_CATEGORY[AGENCY_CODES["경찰청"]],
            "confidence": 1.0,
            "reasoning": "불법 주정차 민원은 경찰청/지자체 단속 사항으로 즉시 분류됩니다.",
            "sources": [],
        }

    logger.info("=" * 60)
    logger.info("[RAG] Query received: %s", user_query)

    # 2. RAG 검색 수행 (상위 3개)
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

    # 3. 질의어 힌트 추출
    query_hint_agency = _infer_query_hint_agency(user_query)

    # 힌트 기관에 기본 점수 부여 (기존 3.0 -> 5.0으로 강화하여 검색 결과 간섭 억제)
    if query_hint_agency != "기타":
        agency_scores[query_hint_agency] += 5.0

    # 유사 민원 사례집이 검색 결과에 포함되어 있는지 확인
    top_source_is_example = False
    for r in results:
        if "complaint_examples.md" in r.get("source", ""):
            top_source_is_example = True
            break

    # 4. 검색 결과 점수 합산
    for r in results:
        raw_source = unicodedata.normalize("NFC", r.get("source", ""))
        filename = os.path.basename(raw_source)
        
        # UI 표시용 이름 보정
        display_name = filename
        if filename == "complaint_examples.md":
            display_name = "유사 민원 사례집 (AI 학습 데이터)"

        rtype = r.get("type", "unknown")

        weight = 1.0
        score_value = float(r.get("score", 0.0))

        # (0) 최소 품질 검증 (Vector 전용)
        if rtype == "vector" and score_value < MIN_VECTOR_SCORE_THRESHOLD:
            logger.info("  -> Skip low quality vector result (score: %.4f)", score_value)
            continue

        # 검색 타입별 가중치 (Vector vs BM25)
        if rtype == "vector":
            weight += score_value
            score_label = "VECTOR"
        else:
            weight += min(1.0, score_value / 10.0)
            score_label = "BM25"

        matched_agency = "기타"

        # (1) 범용 법령 여부 확인
        is_broad_law = any(broad in filename for broad in BROAD_LAWS)

        # (2) 파일명으로 기관 매칭
        for key, agency in KEYWORD_TO_AGENCY.items():
            if key in filename:
                matched_agency = agency
                weight += 0.5
                break

        # (3) 본문 내용으로 기관 매칭 (파일명 매칭 실패 시)
        if matched_agency == "기타":
            text_snippet = (r.get("text", "") or "")[:700]
            for key, agency in KEYWORD_TO_AGENCY.items():
                if key in text_snippet:
                    matched_agency = agency
                    break

        # (4) 범용 법령 패널티 적용
        if is_broad_law:
            if query_hint_agency != "기타":
                matched_agency = query_hint_agency
            weight *= BROAD_LAW_PENALTY # 점수 감점

        # (5) 힌트 일치 보너스
        if matched_agency == "기타" and query_hint_agency != "기타":
            matched_agency = query_hint_agency
            weight += 0.2
        elif matched_agency != "기타" and matched_agency == query_hint_agency:
            weight += 1.0

        # 점수 누적
        agency_scores[matched_agency] += weight
        source_details.append(f"{display_name} ({score_label}: {score_value:.4f})")

    # 5. 행안부 과다 방지 게이트
    _apply_mois_guard(user_query, agency_scores)

    # 6. 최종 기관 결정
    best_agency, best_score, confidence = _decide_with_fallback_to_other_or_etc(agency_scores)

    agency_code = AGENCY_CODES.get(best_agency, AGENCY_CODES["기타"])
    category = AGENCY_TO_CATEGORY.get(agency_code, "기타")

    if best_agency == "기타":
        reasoning = "뚜렷한 소관 기관을 특정하기 어려워 '기타'로 분류했습니다."
    else:
        if top_source_is_example:
            reasoning = f"유사 민원 사례 분석 결과, '{best_agency}' 소관 업무로 판단됩니다."
        else:
            reasoning = f"관련 법령 및 키워드 분석 결과, '{best_agency}' 소관으로 가장 높게 식별되었습니다."

    top_source_text = (results[0].get("text", "내용 없음") or "")[:150] + "..."

    # 로깅 출력
    logger.info("-" * 40)
    logger.info("[ANALYSIS REPORT]")
    logger.info("1. 입력 텍스트: %s", user_query)
    logger.info("2. 질의 힌트: %s", query_hint_agency)
    logger.info("3. 점수 상위: %s", agency_scores.most_common(5))
    logger.info("4. 최종 결과: %s", best_agency)
    logger.info("5. 신뢰도: %s", confidence)
    logger.info("-" * 40)

    return {
        "agency_code": agency_code,
        "agency_name": best_agency,
        "category": category,
        "confidence": confidence,
        "reasoning": reasoning,
        "sources": source_details,
    }