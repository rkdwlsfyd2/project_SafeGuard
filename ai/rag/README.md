# Project SafeGuard - AI RAG 민원 분류 시스템

## 1. 개요 (Overview)
본 시스템은 사용자의 민원 텍스트를 분석하여 최적의 담당 행정기관을 분류하는 **RAG(Retrieval-Augmented Generation)** 기반 분석 엔진입니다. 단순한 키워드 매칭을 넘어 법령 텍스트의 의미적 유사성(Vector Search)과 키워드 빈도(BM25)를 하이브리드로 결합하고, 자체 개발한 **다중 레이어 가중치 알고리즘**을 통해 높은 분류 정확도를 보장합니다.

---

## 2. 파일별 역할 (File Roles)

| 파일명 | 역할 | 상세 설명 |
| :--- | :--- | :--- |
| **`app.py`** | **Entry Point** | FastAPI 서버 엔진. API 엔드포인트(/classify) 및 통신 규격 관리 |
| **`classification_service.py`** | **Brain** | **[핵심 알고리즘]** 검색 결과를 도메인 규칙에 따라 해석하고 최종 결정을 내리는 판단 레이어 |
| **`query.py`** | **Retriever** | 벡터 검색과 키워드 검색을 수행하고 RRF 알고리즘으로 결과물을 통합 |
| **`milvus_client.py`** | **DB Connector** | 벡터 데이터베이스(Milvus) 연결 및 컬렉션 스키마 관리 표준 인터페이스 |
| **`ingest.py`** | **Preprocessor** | PDF 법령 데이터를 분석하여 벡터 DB 및 키워드 인덱스로 변환/적재하는 도구 |
| **`logging_config.py`** | **Monitor** | 시스템 내부 분석 프로세스를 운영자가 실시간으로 파악할 수 있게 하는 로깅 설정 |
| **`README.md`** | **Manual** | 시스템 아키텍처 및 알고리즘 동작 원리 가이드 문서 |

---

## 3. 파일 실행 순서 및 워크플로우 (File Execution Sequence)

### 3.1 전체 흐름 요약 (Visual Flow)
> **입력(`app.py`)** → **의도 파악(`classification_service.py`)** → **법령 검색(`query.py`)** → **가중치 판정(`classification_service.py`)** → **응답(`app.py`)**

---

### 3.2 단계별 상세 실행 순서

#### [Phase 1] 데이터 준비 단계 (초기 1회 또는 데이터 업데이트 시)
1. **`ingest.py`**: 시스템 구동을 위한 최우선 실행 파일입니다.
   - 내부적으로 `milvus_client.py`를 참조하여 DB 연결을 초기화합니다.
   - `rag_data/`의 PDF를 읽어 벡터 DB와 BM25 인덱스를 생성합니다.

#### [Phase 2] 실시간 분석 서비스 (Runtime Phase)
1. **`app.py` (FastAPI Server)**: 시스템의 입구입니다. `logging_config.py`를 로드하여 서버를 시작합니다.
2. **`classification_service.py` (의도 분석 시작)**: 사용자의 질문이 들어오면 가장 먼저 호출되어 핵심 키워드를 선추출합니다.
3. **`query.py` (하이브리드 검색)**: 분석 엔진의 요청을 받아 Milvus와 BM25에서 관련 법령 후보군을 가져옵니다.
4. **`classification_service.py` (가중치 판정)**: 가져온 후보군에 개편된 가중치 알고리즘을 적용하여 최종 기관을 확정합니다.
5. **`app.py` (결과 반환)**: 확정된 데이터를 JSON 형식으로 사용자에게 최종 응답합니다.

---

## 4. 핵심 알고리즘 상세 (Core Algorithm Details)

**핵심 로직 위치**: `ai/rag/classification_service.py` 내 `classify_complaint()` 함수.

### 4.1 가중치 개편 상세 매역
1.  **선제적 의도 추출 (Query Hinting)**: 질문 내 핵심 키워드 발견 시 전문 기관에 **3.0점의 베이스 스코어**를 선부여합니다.
2.  **검색 결과 스코어 정규화**: 벡터(COSINE) 점수와 BM25 점수를 동일 수준으로 환산하여 결합합니다.
3.  **범용 법령 필터링**: 포괄적 법령(지방자치법 등) 매칭 시 **가중치를 0.8배 감쇄**시키고 점수를 전문 기관으로 리디렉션합니다.
4.  **교차 검증 보너스**: 검색 결과와 사용자 의도가 일치할 경우 **+1.0점**의 추가 신뢰도 점수를 부여합니다.

### 4.2 실제 구현 코드 (Snippet)

```python
# [핵심 로직] 범용 법령이고 질의 힌트가 있다면, 힌트 기관으로 매칭 시도
if is_broad_law:
    if query_hint_agency != "기타":
        matched_agency = query_hint_agency # 범용 법령 점수를 전문 의도로 리디렉션
        weight *= 0.8 # 포괄적 법령의 영향력 감쇄
    else:
        matched_agency = "행정안전부" # 힌트가 없으면 기본값

# [핵심 로직] 최종 가중치 합산 및 교차 검증 보너스
if matched_agency != "기타" and matched_agency == query_hint_agency:
    weight += 1.0 # 검색 결과와 사용자 의도가 일치하면 강력 보너스
```

---

## 5. 입출력 규격 및 시스템 연동

### 5.1 분석 결과 데이터 (JSON 예시)
```json
{
  "agency_code": 12,
  "agency_name": "기후에너지환경부",
  "category": "환경",
  "reasoning": "검색된 법령 근거 중 가장 높은 점수가 '기후에너지환경부' 소관으로 판단되었습니다.",
  "sources": ["악취방지법.pdf (COSINE: 0.9241)"],
  "message": "Success"
}
```

### 5.2 운영 리포트 (Real-time Report)
서버 터미널에서 `docker logs -f safeguard-ai-rag` 명령어를 통해 실시간 확인 가능합니다.
