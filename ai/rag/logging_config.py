"""
rag/logging_config.py
: 로깅 설정 모듈

[역할]
- 애플리케이션 전체의 로그 포맷을 JSON 형태로 표준화
- 컨테이너 환경(Docker, ELK Stack 등)에서 로그 수집이 용이하도록 설정

[주요 기능]
- setup_logging: 루트 로거(Root Logger) 초기화 및 JSON 포맷터 적용

[시스템 흐름]
1. `app.py` 시작 시 `setup_logging()` 호출
2. 기존 핸들러 제거 (중복 방지)
3. StreamHandler 생성 (콘솔 출력용)
4. JsonFormatter 적용 (로그를 JSON 문자열로 변환)
5. 루트 로거에 핸들러 등록

[파일의 핵심목적]
- 로그의 가독성 및 기계적 분석(Parsing) 편의성을 위한 공통 로깅 설정
"""

import logging
from pythonjsonlogger import jsonlogger

def setup_logging():
    """
    애플리케이션의 로깅 설정을 초기화합니다.
    모든 로그를 JSON 형식으로 콘솔에 출력하도록 구성합니다.
    """
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    handler = logging.StreamHandler()  

    # JSON 포맷터 설정 (한글 깨짐 방지: json_ensure_ascii=False)
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s',
        json_ensure_ascii=False
    )
    handler.setFormatter(formatter)

    # 기존 핸들러 제거 후 새 핸들러 등록
    root.handlers = []   
    root.addHandler(handler)