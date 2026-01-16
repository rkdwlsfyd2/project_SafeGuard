"""
rag/complainttitle.py
: 민원 제목 자동 생성 모듈

[역할]
- 민원 텍스트와 주소를 기반으로 가독성 좋고 핵심적인 제목을 자동 생성
- 형태소 분석기(Kiwi)를 사용하여 핵심 키워드(장소, 행위 등) 추출

[주요 기능]
- generate_complaint_title: 민원 제목 생성 메인 함수 (포맷: [유형] 핵심키워드 / 주소)
- summarize_text: 민원 내용에서 중요 키워드(장소 > 행위)를 우선추출하여 요약
- parse_address: 긴 주소를 '시/도 + 시/군/구' 형태로 간소화

[시스템 흐름]
1. 입력: 민원 텍스트, 주소, 민원 유형(텍스트/음성)
2. 내용 요약 (summarize_text)
   - 형태소 분석으로 명사 추출
   - 장소 키워드 우선 탐색 (예: 사거리, 아파트, 역)
   - 민원 행위 키워드 차선 탐색 (예: 주정차, 소음, 파손)
   - 없으면 첫 문장 발췌
3. 주소 요약 (parse_address)
4. 포맷팅 및 반환

[파일의 핵심목적]
- 사용자가 제목을 직접 입력하지 않아도, 내용을 대표하는 직관적인 제목을 자동 생성해주는 유틸리티
"""

import re
from kiwipiepy import Kiwi

# Kiwi 인스턴스 전역 생성 (비용 절약)
kiwi = Kiwi()

# 우선순위 키워드 정의
LOCATION_KEYWORDS = ["역", "사거리", "교차로", "학교", "아파트", "공원", "시장", "마트", "주차장", "병원", "센터", "도서관", "입구", "출구"]
COMPLAINT_KEYWORDS = ["주정차", "주차", "쓰레기", "악취", "소음", "도로", "가로등", "보수", "신고", "단속", "파손", "공사", "흡연"]

def normalize_text(text: str) -> str:
    """
    텍스트 정규화 및 전처리
    - 붙임말 분리 (역앞 -> 역 앞)
    - 다중 공백 제거
    """
    if not text:
        return ""
    
    # 1. 붙임말 보정 (예: 역앞 -> 역 앞)
    # 주요 장소 접미사 + '앞', '뒤', '옆' 등
    text = re.sub(r'([가-힣]+)(앞|뒤|옆)(?=[에은는이가을를]|\s|$)', r'\1 \2', text)
    text = re.sub(r'앞에', '앞', text)
    
    # 2. 다중 공백 제거
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def summarize_text(text: str, max_length: int = 15) -> str:
    """
    민원 내용을 요약합니다. (우선순위 로직 적용)
    1. 장소 키워드 발견 시 최우선 선택
    2. 민원 행위 키워드 차선 선택
    3. 키워드 없으면 단순 요약(첫 문장)
    """
    if not text:
        return "민원 내용"
        
    normalized_text = normalize_text(text)
    
    # 문장 분리 (첫 문장 사용)
    first_sentence = re.split(r'[.!?\n]', normalized_text)[0].strip()
    if not first_sentence:
        first_sentence = normalized_text[:30]

    try:
        # 형태소 분석으로 명사 추출
        tokens = kiwi.tokenize(first_sentence)
        nouns = [t.form for t in tokens if t.tag in ('NNG', 'NNP')]
        
        # Priority 1: 장소 키워드 탐색
        for noun in nouns:
            for loc in LOCATION_KEYWORDS:
                if loc in noun:
                    # 장소 키워드 발견 시 문맥(앞/뒤/옆) 포함하여 반환
                    summary = noun
                    if f"{noun} 앞" in first_sentence:
                        summary += " 앞"
                    elif f"{noun} 뒤" in first_sentence:
                        summary += " 뒤"
                    elif f"{noun} 옆" in first_sentence:
                        summary += " 옆"
                    return summary

        # Priority 2: 민원 행위/대상 키워드 탐색
        for noun in nouns:
            for comp in COMPLAINT_KEYWORDS:
                if comp in noun:
                    return noun
        
        # Priority 3: 단순 요약 (길이 제한)
        if len(first_sentence) > 12:
            return first_sentence[:12].strip()
        else:
            return first_sentence

    except Exception as e:
        print(f"Kiwi analysis failed: {e}")
        return normalized_text[:12]

def parse_address(address: str) -> str:
    """
    전체 주소에서 '시/도 시/군/구' 까지만 추출하여 간소화합니다.
    예: '경기도 남양주시 진건읍...' -> '경기 남양주시' (또는 유사 형태)
    """
    if not address:
        return ""
    
    # 주소 문자열 정리
    address = address.strip()
    parts = address.split()
    
    if len(parts) >= 2:
        city = parts[0]
        district = parts[1]
        
        # 시/도 이름 정규화
        if city == "서울특별시": city = "서울시"
        elif city == "제주특별자치도": city = "제주도"
        elif city == "세종특별자치시": city = "세종시"
        elif city.endswith("광역시"): pass # 부산광역시 등은 유지 (필요 시 수정)
        
        return f"{city} {district}"
        
    return address

def generate_complaint_title(text: str, address: str, type: str) -> str:
    """
    민원 유형, 내용, 주소를 조합하여 최종 제목을 생성합니다.
    형식: [유형] 요약 / 주소
    """
    summary = summarize_text(text)
    short_address = parse_address(address)
    
    if not summary:
        summary = "민원 내용"
        
    if short_address:
        return f"[{type}] {summary} / {short_address}"
    else:
        return f"[{type}] {summary}"
