
# SafeGuard RAG (Retrieval-Augmented Generation) Service

## 1. 개요 (Overview)
RAG 서비스는 사용자의 민원 텍스트를 분석하여 적절한 담당 행정 기관을 분류하고, 민원 제목을 자동 생성하는 핵심 AI 모듈입니다.
법령 데이터베이스(Vector DB)를 기반으로 한 하이브리드 검색과 규칙 기반 분류 로직을 결합하여 높은 정확도를 제공합니다.
Docker 컨테이너 환경(`safeguard-ai-rag`)에서 실행되며, FastAPI를 통해 외부 시스템과 통신합니다.

---

## 2. 파일 구조 및 역할 (File Structure and Roles)
각 파일의 역할과 내부 핵심 기능을 상세히 기술합니다.

### 2.1. `app.py`
**역할**: RAG 서비스의 엔트리포인트이자 API 서버입니다. FastAPI 프레임워크를 기반으로 HTTP 요청을 처리합니다.

- **주요 엔드포인트**:
  - `POST /classify`: 민원 텍스트를 입력받아 최종 기관 분류 결과를 반환합니다. `classification_service.py`의 로직을 호출합니다.
  - `POST /generate-title`: 민원 내용과 주소를 받아 제목을 생성합니다. `complainttitle.py`의 로직을 호출합니다.
  - `GET /health`: 서버의 상태(Health Check)를 반환합니다.
- **주요 기능**:
  - 서버 시작 시(`startup_event`) `milvus_client`를 통해 데이터베이스 연결을 초기화합니다.
  - CORS 설정을 통해 프론트엔드 등 외부 도메인에서의 접근을 허용합니다.
  - Pydantic 모델(`ComplaintInput`, `TitleGenInput`)을 사용하여 입력 데이터의 유효성을 검사합니다.

### 2.2. `classification_service.py`
**역할**: 검색 엔진에서 가져온 법령 데이터와 사용자 입력을 종합하여 최종 '행정 기관'을 결정하는 도메인 로직 계층입니다.

- **핵심 함수**: `classify_complaint(user_query)`
- **분류 알고리즘 (Logic Flow)**:
  1.  **전처리 (Preprocessing)**: 입력 텍스트의 공백을 제거하여 정규화합니다.
  2.  **강제 규칙 (Hard Rules)**:
      - "불법 주정자" 등 명확한 패턴이 발견되면 복잡한 검색 과정을 생략하고 즉시 '경찰청'으로 분류합니다.
      - 이는 오분류를 방지하고 응답 속도를 최적화하는 역할을 합니다.
  3.  **검색 (Retrieval)**: `query.py`의 `ask()` 함수를 호출하여 관련 법령 문서를 가져옵니다.
  4.  **점수 산정 (Scoring)**:
      - 검색된 법령 파일명과 본문에 포함된 키워드를 분석하여 기관별 점수를 매깁니다.
      - 범용 법령(지방자치법 등)은 가중치를 낮추어 특정 기관으로 쏠리는 현상을 방지합니다 (Penalty Logic).
      - 사용자 질문에 포함된 키워드와 일치하는 기관에는 가중치를 더 부여합니다 (Bonus Logic).
  5.  **최종 결정 (Decision)**: 가장 높은 점수를 획득한 기관을 선정하고, 신뢰도(Confidence)와 판단 근거(Reasoning)를 생성합니다.

### 2.3. `query.py`
**역할**: 사용자의 질문에 대해 실제 데이터베이스 검색을 수행하는 검색 엔진 모듈입니다.

- **핵심 함수**: `ask(question, top_k)`
- **검색 전략 (Hybrid Search)**:
  - **Vector Search (`perform_vector_search`)**:
    - `SentenceTransformer` 모델을 사용하여 질문을 384차원 벡터로 변환합니다.
    - Milvus DB에서 코사인 유사도(Cosine Similarity)가 높은 문서를 찾습니다. (의미 기반 검색)
  - **Keyword Search (`perform_bm25_search`)**:
    - `Kiwipiepy` 형태소 분석기를 사용하여 질문을 토큰화합니다.
    - 사전에 생성된 `BM25` 인덱스를 통해 키워드 매칭 점수가 높은 문서를 찾습니다. (단어 기반 검색)
  - **RRF (Reciprocal Rank Fusion)**:
    - 위 두 가지 검색 결과를 `1 / (k + rank)` 공식을 사용하여 하나의 순위로 통합합니다.
    - 이를 통해 의미적 유사성과 키워드 정확도를 모두 고려한 최적의 문서를 반환합니다.

### 2.4. `complainttitle.py`
**역할**: 민원 텍스트를 분석하여 사용자가 보기 편한 제목을 자동으로 생성하는 유틸리티 모듈입니다.

- **핵심 함수**: `generate_complaint_title(text, address, type)`
- **요약 알고리즘 (Priority Logic)**:
  1.  **장소 우선 (Location First)**: 텍스트에서 '역', '학교', '아파트' 등의 장소 명사가 발견되면 이를 제목의 핵심으로 사용합니다. (예: "사릉역 앞")
  2.  **행위 우선 (Act First)**: 장소가 없다면 '주정차', '소음', '쓰레기' 등의 행위 명사를 사용합니다.
  3.  **단순 요약 (Fallback)**: 위 키워드가 모두 없다면 문장의 앞부분(12자)을 잘라서 사용합니다.
- **주소 정규화**: 복잡한 전체 주소에서 시/군/구 단위(예: "경기도 남양주시")까지만 추출하여 가독성을 높입니다.
- **형태소 분석**: `Kiwipiepy` 라이브러리를 사용하여 명사(NNG, NNP)를 정확하게 추출합니다.

### 2.5. `ingest.py`
**역할**: PDF 형태의 법령 데이터를 읽어 벡터 데이터베이스(Milvus)에 적재하는 데이터 파이프라인 스크립트입니다.

- **실행 시점**: 시스템 초기 구축 시 또는 법령 데이터가 업데이트되었을 때 1회 실행합니다.
- **처리 과정 (Pipeline)**:
  1.  **Text Extraction**: `pdfplumber`를 사용하여 PDF 파일에서 텍스트를 추출합니다.
  2.  **Chunking**: 긴 텍스트를 500자 단위로 자르고, 100자씩 겹치게(Overlap) 하여 문맥이 끊기지 않도록 합니다.
  3.  **Embedding**: `SentenceTransformer` 모델을 사용하여 각 청크를 벡터로 변환합니다.
  4.  **Indexing**: BM25 검색을 위한 역색인(Inverted Index)을 생성하여 로컬 파일(`bm25_index.pkl`)로 저장합니다.
  5.  **Storage**: 벡터 데이터와 메타데이터를 Milvus DB에 Insert 합니다.

### 2.6. `milvus_client.py`
**역할**: Milvus 데이터베이스와의 연결, 컬렉션 생성, 인덱스 관리를 전담하는 모듈입니다.

- **주요 기능**:
  - `connect_milvus()`: Docker 네트워크상의 Milvus 서버에 접속합니다.
  - `create_collection()`: 데이터 스키마(ID, Embedding, Text, Source)를 정의하고 컬렉션을 생성합니다.
  - `get_collection()`: 다른 모듈(ingest, query)에서 컬렉션 객체를 요청할 때 안전하게 반환합니다.

---

## 3. 설치 및 실행 가이드 (Setup & Run)

### 3.1. 필수 요구사항
- Docker 및 Docker Compose
- Python 3.9+ (로컬 테스트 시)

### 3.2. 데이터 적재 (Data Ingestion)
서비스를 처음 실행하기 전에 반드시 법령 데이터를 DB에 넣어야 합니다.
```bash
# Milvus 및 관련 컨테이너 실행
docker-compose up -d

# RAG 컨테이너 내부에서 데이터 적재 스크립트 실행
docker exec -it safeguard-ai-rag python ingest.py
```

### 3.3. 서버 실행
```bash
# 전체 서비스 빌드 및 실행
docker-compose up -d --build
```
- API 서버 포트: **8001**
- Swagger 문서: `http://localhost:8001/docs` (FastAPI 자동 생성)

---

## 4. API 명세 (Specification)

### 4.1. 기관 분류 (`POST /classify`)
- **설명**: 사용자 텍스트 민원을 분석하여 담당 기관을 반환합니다.
- **Request Body**:
  ```json
  {
    "text": "도로에 싱크홀이 생겨서 위험합니다."
  }
  ```
- **Response**:
  ```json
  {
    "agency_code": 1,
    "agency_name": "국토교통부",
    "category": "교통",
    "reasoning": "도로법 및 안전 관리 규정에 의거...",
    "sources": ["도로법.pdf", "시설물안전법.pdf"]
  }
  ```

### 4.2. 제목 생성 (`POST /generate-title`)
- **설명**: 민원 내용과 주소를 조합하여 요약 제목을 생성합니다.
- **Request Body**:
  ```json
  {
    "text": "사릉역 1번 출구 앞에 불법주차가 너무 심해요.",
    "address": "경기도 남양주시 진건읍",
    "type": "TEXT"
  }
  ```
- **Response**:
  ```json
  {
    "title": "[텍스트민원] 사릉역 앞 / 경기도 남양주시"
  }
  ```
