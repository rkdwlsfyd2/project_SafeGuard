import re

def _extract_location(text: str) -> str:
    """간단한 규칙 기반 위치 정보 추출"""
    # 1. '구', '동', '로', '길' 등으로 끝나는 주소 패턴
    address_pattern = re.compile(r'([가-힣]+(시|구|동|읍|면|리|로|길|대로)(\s+[0-9]+(-[0-9]+)?)?)')
    match_addr = address_pattern.search(text)
    if match_addr:
        return match_addr.group(0)
        
    # 2. '역', '사거리', '교차로', '앞', '뒤', '옆' 등 주요 지점 패턴
    spot_pattern = re.compile(r'([가-힣0-9]+(역|사거리|교차로|초등학교|중학교|고등학교|아파트|빌라|청사|공원)(\s+(앞|뒤|옆|근처|인근|맞은편))?)')
    match_spot = spot_pattern.search(text)
    if match_spot:
        return match_spot.group(0)
        
    return "위치 정보 없음"

test_cases = [
    "교대역 앞에 불법주차된 차가 있어요",
    "강남구 서초동 123-4 번지 쓰레기",
    "홍대입구역 3번출구 근처 노점상",
    "집 앞에 쓰레기가 많아요", # '앞' is covered in spot_pattern but needs a noun before it?
    "시청역 근처",
    "테헤란로 14길 가로등 고장"
]

for t in test_cases:
    print(f"'{t}' -> '{_extract_location(t)}'")
