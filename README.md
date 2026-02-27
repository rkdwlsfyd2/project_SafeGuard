# SafeGuard
[![Java 17](https://img.shields.io/badge/Java-17-blue)](#)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.1-6DB33F)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.9-009688)](#)
[![React](https://img.shields.io/badge/React-Vite%20%2B%20TS-61DAFB)](#)
[![Milvus](https://img.shields.io/badge/VectorDB-Milvus-00B3A4)](#)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20PostGIS-336791)](#)

멀티모달 AI 기반 민원 자동 분류 및 처리 플랫폼입니다.  
텍스트, 음성, 이미지로 접수된 민원을 AI가 분석해 **담당 기관/민원 유형을 추천**하고, 백엔드와 GIS 대시보드로 **접수-배정-처리-알림** 흐름을 연결합니다.

- Demo: 없음
- Screenshots: 레포/문서 내 이미지 참고
- 팀/개인: [팀]
- 내 역할: [AI YOLO , RAG , 백엔드,프론트엔드,알림 서비스]
- 개발 기간: [2025.12.02~2026.01.27]

## Why it matters
- 민원 사용자는 담당 기관을 몰라도 자연어/음성/이미지로 신고를 시작할 수 있습니다.
- 운영자는 기관별 대시보드, GIS 지도, SLA 지표로 병목과 지연 민원을 빠르게 확인할 수 있습니다.
- 핵심 차별점은 단순 폼 앱이 아니라, **RAG + YOLO + Whisper**를 실제 제품 흐름에 붙여 자동 분류 정확도를 높인 점입니다.

---

## 1. Project Overview

### One-liner
**SafeGuard는 법령 기반 RAG, 이미지 객체 탐지, 음성 STT를 결합해 민원을 자동 분류하고 담당 기관에 연결하는 AI-first 민원 처리 시스템입니다.**

### Repository structure
```text
project_SafeGuard/
├─ backend/          # Spring Boot + MyBatis API
├─ frontend/         # React + Vite + TypeScript UI
├─ ai/
│  ├─ rag/           # FastAPI RAG service + Milvus + BM25
│  ├─ stt/           # FastAPI Whisper STT service
│  └─ yolo/          # FastAPI YOLO image analysis service
├─ prisma/           # DB init SQL
├─ uploads/          # Local uploaded files
├─ docker-compose.yml
├─ Dockerfile        # frontend build + nginx serving
└─ nginx.conf.template
```

---

## 2. AI Core

## Problem Definition
민원 내용은 짧고 모호한 경우가 많아, 사용자가 직접 담당 기관을 고르기 어렵습니다.  
예를 들어 "심야 시간대 공사 소음"은 도로/건설/환경 중 어디로 가야 하는지 헷갈릴 수 있습니다.

### Input / Output
| 구분 | 입력 | 출력 |
|---|---|---|
| 텍스트 AI | 민원 제목/내용 | 담당 기관, 민원 카테고리, confidence, reasoning, source 문서 |
| 음성 AI | 음성 파일 | 전사 텍스트 + 텍스트 기반 기관 분류 결과 |
| 이미지 AI | 신고 이미지 | 탐지 결과 기반 민원 유형/기관 추천 |
| 운영 AI | 민원 이벤트 | 대시보드 지표, GIS 시각화, 사용자 알림 |

---

## 3. AI Pipeline Summary

| 모듈 | 문제 | 접근 방식 | 핵심 라이브러리/모델 | 서빙 |
|---|---|---|---|---|
| RAG 분류 | 자유 텍스트 민원 → 담당 기관 추천 | Hybrid retrieval + rule-based scoring | `sentence-transformers`, `Milvus`, `rank_bm25`, `kiwipiepy` | FastAPI |
| STT | 음성 민원 → 텍스트 전사 | Whisper 기반 음성 인식 | `openai-whisper`, `torch`, `ffmpeg` | FastAPI |
| Image AI | 이미지 민원 → 유형/기관 추천 | YOLO 객체 탐지 | `ultralytics`, `torch`, `opencv-python-headless` | FastAPI |

---

## 4. AI Detail

### 4.1 Text RAG Classifier

#### What it does
텍스트 민원을 받아 관련 법령을 검색하고, 검색 결과와 도메인 규칙을 합쳐 최종 기관을 결정합니다.

#### Approach
- 모델 유형: **RAG 기반 분류 시스템**
- 사용 방식: **생성형 에이전트가 아니라 검색 + 점수화 + 규칙 기반 결정**
- 랭체인 사용 여부: **사용하지 않음**
- 구현: FastAPI + custom retrieval/scoring pipeline

#### Retrieval strategy
1. 민원 텍스트 입력
2. Hard rule 적용
   - 예: `불법주정차` 관련 표현은 우선적으로 경찰청
3. Hybrid retrieval
   - Vector search: `paraphrase-multilingual-MiniLM-L12-v2`
   - Keyword search: Kiwi 형태소 분석 + BM25
4. RRF(Reciprocal Rank Fusion)로 재정렬
5. 기관별 점수 합산
6. Guardrail 적용
   - 범용 법령 과대 영향 완화
   - confidence threshold 미달 시 `기타`
7. 담당 기관/카테고리/근거 문서 반환

#### Why this design
- 단순 키워드 룰만으로는 표현 다양성을 못 잡음
- 벡터 검색만 쓰면 법령 제목/용어 매칭이 약해짐
- 그래서 **Semantic Search + Lexical Search + Domain Rule**을 함께 사용

#### Embedding / Search
| 항목 | 값 |
|---|---|
| 임베딩 모델 | `paraphrase-multilingual-MiniLM-L12-v2` |
| 벡터 차원 | 384 |
| Vector DB | Milvus |
| Keyword Search | BM25 |
| Tokenizer | Kiwi |
| Fusion | RRF |

#### Data
| 항목 | 내용 |
|---|---|
| 출처 | 레포 내 `ai/rag/rag_data`의 공공 법령 PDF |
| 규모 | **86개 PDF 법령 문서** |
| 보조 데이터 | `complaint_examples.md`, BM25 인덱스 파일 |
| 전처리 | PDF 텍스트 추출, 청크 분할, 임베딩 생성, Milvus 적재, BM25 인덱싱 |
| 청크 방식 | 문서 일부를 겹치게 나누는 오버랩 기반 청킹 |

#### Training / Indexing Flow
```text
PDF 수집
→ 텍스트 추출(pdfplumber)
→ 청크 분할
→ 임베딩 생성(sentence-transformers)
→ Milvus 적재
→ BM25 인덱스 생성(pickle)
```

#### Inference Flow
```text
사용자 텍스트
→ Hard Rule
→ Vector Search + BM25
→ RRF 결합
→ 기관별 스코어링
→ Guardrail / Threshold
→ 기관/카테고리/근거 반환
```

#### Sample response
```json
{
  "agency_code": 30,
  "agency_name": "기후에너지환경부",
  "category": "환경",
  "confidence": 0.82,
  "reasoning": "소음/공사 관련 키워드와 소음·진동관리법 검색 결과가 일치",
  "sources": [
    "소음ㆍ진동관리법(법률)(제21065호)(20251001).pdf",
    "소음ㆍ진동관리법 시행령(대통령령)(제35939호)(20251223).pdf"
  ],
  "message": "Success"
}
```

---

### 4.2 Speech-to-Text

#### What it does
음성 민원을 텍스트로 전사한 뒤, 전사 결과를 민원 데이터로 연결합니다.

#### Model / Library
- 모델 유형: STT
- 사용 모델: **OpenAI Whisper `base`**
- 라이브러리: `openai-whisper`, `torch`, `imageio-ffmpeg`

#### Design notes
- `base` 모델 사용
- ffmpeg 경로를 런타임에 보정
- 저신뢰/무음/반복 텍스트를 줄이기 위한 필터 로직 포함
- RAG 서비스 장애 시 키워드 기반 fallback 분류 존재

#### Inference Flow
```text
음성 업로드
→ ffmpeg 처리
→ Whisper 전사
→ 무의미 반복/환각 필터링
→ RAG 분류 호출
→ 텍스트 + 추천 기관 반환
```

---

### 4.3 Image Analysis

#### What it does
신고 이미지를 입력받아 객체 탐지 결과를 기반으로 민원 유형과 담당 기관을 추천합니다.

#### Model / Library
- 모델 유형: 객체 탐지
- 사용 라이브러리: `ultralytics`, `torch`, `opencv-python-headless`
- 가중치 파일: `best.pt`, `infer_image_complaint.pt`, `5k_each.pt`

#### Inference Flow
```text
이미지 업로드
→ content-type / file size 검증
→ 임시 파일 저장
→ YOLO inference
→ 유형/기관 매핑
→ JSON 응답
```

#### Sample response
```json
{
  "type": "불법주정차",
  "agency": "경찰청",
  "message": "success"
}
```

---

## 5. Model Card

### Model Card: RAG Classifier
| 항목 | 내용 |
|---|---|
| 목적 | 자유 텍스트 민원을 담당 기관과 카테고리로 분류 |
| 입력 | 한국어 민원 텍스트 |
| 출력 | 기관명, 기관코드, 카테고리, confidence, reasoning, source |
| 데이터 | 86개 법령 PDF + 예시 민원 텍스트 |
| 검색 | Milvus + BM25 |
| 지표 | [TBD] |
| 위험 | 짧거나 모호한 문장, 범용 법령 과적합, 최신 법령 미반영 |
| 완화 장치 | Hard rule, threshold, broad-law penalty, MOIS guard, 기타 fallback |

### Model Card: Whisper STT
| 항목 | 내용 |
|---|---|
| 목적 | 음성 민원을 텍스트로 전사 |
| 입력 | 음성 파일 |
| 출력 | 한국어 전사 텍스트 |
| 모델 | Whisper `base` |
| 지표 | [TBD] |
| 주의 | 잡음, 무음, 발음, 사투리, 짧은 발화에 취약 가능 |

### Model Card: YOLO Detector
| 항목 | 내용 |
|---|---|
| 목적 | 이미지 기반 민원 유형 추론 |
| 입력 | 신고 이미지 |
| 출력 | 민원 유형, 담당 기관 |
| 모델 | YOLO 계열 가중치 파일 포함 |
| 지표 | [TBD] |
| 주의 | 클래스 정의 밖 객체, 조도/가림/원거리 이미지에서 성능 저하 가능 |

---

## 6. Evaluation

### Metrics
현재 README 기준으로 정리 가능한 평가지표 상태는 아래와 같습니다.

| 모듈 | 지표 | 결과 |
|---|---|---|
| RAG 분류 | Accuracy / F1 / Top-k Recall | [TBD] |
| STT | WER / CER | [TBD] |
| YOLO | mAP / Precision / Recall | [TBD] |
| 시스템 | API latency / uptime / cost | [TBD] |

### Error Analysis
실제 구현/운영 중 확인된 대표 실패 케이스:

1. **공사 소음 민원 오분류**
   - 예: "심야 시간대 공사 소음"
   - 실패 유형: 국토교통부/건설 계열로 치우침
   - 원인: `공사` 키워드가 시설/건축 문맥으로 더 강하게 작동
   - 대응: `소음`, `진동`, `공사 소음` 관련 환경 키워드 가중치 강화

2. **범용 행정 법령 과대 영향**
   - 실패 유형: 모호한 민원이 행정안전부로 과도하게 몰림
   - 원인: 공통 행정 법령이 다수 민원과 겹침
   - 대응: broad-law penalty, MOIS guard 적용

3. **짧은/애매한 텍스트**
   - 예: "너무 시끄러워요"
   - 실패 유형: confidence 부족
   - 대응: threshold 미달 시 `기타`로 안전하게 fallback

---

## 7. Limitations & Next Steps

### Current limitations
1. 법령 기반 RAG는 강하지만, 실제 운영 기관의 내부 업무 규정까지 반영하지는 못함
2. 최신 법령 반영은 인덱스 재생성이 필요함
3. STT는 잡음/사투리/짧은 음성에서 품질 저하 가능
4. YOLO 클래스 정의가 레포만으로는 명확히 문서화되어 있지 않음
5. 정량 평가 수치(F1, mAP, WER)가 README 수준으로 정리되어 있지 않음
6. 프롬프트 기반 생성형 설명보다 결정형 분류에 초점을 맞춰 reasoning 표현이 제한적임
7. S3 미설정 시 로컬 업로드 fallback이 동작하지만 운영 환경 일관성은 별도 점검 필요
8. 민감한 민원 텍스트에 대한 비식별화 정책은 [TBD]

### Roadmap
1. **P1**: RAG 분류셋 구축 및 정량 평가 지표 산출
2. **P1**: 법령 업데이트 자동 ingest 파이프라인 구축
3. **P1**: 기관/업무 규정 수준의 지식 소스 확장
4. **P2**: STT 품질 평가셋 구축 및 잡음 강건성 개선
5. **P2**: YOLO 데이터셋/클래스 문서화 및 mAP 리포트 추가
6. **P2**: 사용자 피드백 기반 active learning 루프 설계
7. **P3**: 알림/대시보드 이벤트의 E2E 테스트 자동화
8. **P3**: 개인정보 마스킹 및 감사 로그 정책 강화

---

## 8. System Architecture

### ASCII Architecture
```text
[React Frontend]
   │
   │ HTTP / SSE
   ▼
[Spring Boot Backend]
   ├─ Auth / Complaints / Dashboard / GIS / Notifications
   ├─ calls /api/rag/analyze  ───────────────► [FastAPI RAG Service]
   │                                            ├─ SentenceTransformer
   │                                            ├─ BM25 + Kiwi
   │                                            └─ Milvus Vector DB
   │
   ├─ calls /api/stt/transcribe ──────────────► [FastAPI STT Service]
   │                                            └─ Whisper
   │
   ├─ calls /api/yolo/analyze ────────────────► [FastAPI YOLO Service]
   │                                            └─ YOLO inference
   │
   ├─ JDBC / MyBatis ─────────────────────────► [PostgreSQL + PostGIS]
   ├─ file upload ────────────────────────────► [S3 or local uploads/]
   └─ SSE notification stream ───────────────► [Client]

[Milvus Stack]
   ├─ Milvus
   ├─ Etcd
   └─ MinIO
```

### Request flow
```text
Client submits complaint
→ Backend validates/authenticates request
→ Backend calls AI service if needed
→ AI returns classification result
→ Backend stores complaint + spatial info + agency mapping
→ Dashboard/GIS/Notifications reflect state changes
```

---

## 9. Product Features

### User-facing features
- 텍스트 민원 등록
- 음성 민원 등록 및 STT 전사
- 이미지 민원 분석
- 카카오 지도 기반 위치 선택
- 민원 목록/상세 조회
- 좋아요/반응
- 내 민원 조회
- 상태 변경/답변에 대한 알림 수신

### AI-facing features
- 법령 기반 담당 기관 자동 추천
- Hybrid retrieval with Milvus + BM25
- Hard rule + threshold + guardrail 기반 오분류 방지
- Whisper 기반 한국어 음성 전사
- YOLO 기반 이미지 유형 판별
- 대시보드용 SLA/지연 민원 분석

---

## 10. Major APIs

## 10.1 RAG Analysis
### `POST /api/rag/analyze`
민원 텍스트를 분석해 담당 기관과 카테고리를 반환합니다.

#### Request
```json
{
  "text": "심야 시간대 공사 소음으로 수면에 큰 지장이 있습니다."
}
```

#### Response
```json
{
  "agency_code": 30,
  "agency_name": "기후에너지환경부",
  "category": "환경",
  "confidence": 0.82,
  "reasoning": "소음/진동 관련 법령 검색 결과와 키워드 힌트가 일치",
  "sources": [
    "소음ㆍ진동관리법(법률)(제21065호)(20251001).pdf"
  ],
  "message": "Success"
}
```

---

## 10.2 Image Analysis
### `POST /api/yolo/analyze`
이미지를 업로드해 민원 유형/기관을 추천합니다.

#### Request
```bash
curl -X POST http://localhost:8080/api/yolo/analyze \
  -F "image=@sample.jpg"
```

#### Response
```json
{
  "type": "불법주정차",
  "agency": "경찰청",
  "message": "success"
}
```

---

## 10.3 Complaint Create
### `POST /api/complaints`
민원을 생성합니다. `multipart/form-data`로 JSON 본문과 파일을 함께 보냅니다.

#### Request
```bash
curl -X POST http://localhost:8080/api/complaints \
  -H "Authorization: Bearer <JWT>" \
  -F 'complaint={
    "title":"도로 쓰레기",
    "content":"도로변에 쓰레기가 장기간 방치되어 있습니다.",
    "category":"환경",
    "isPublic":true,
    "agencyCode":30,
    "location":{
      "address":"서울특별시 강남구 테헤란로 123",
      "lat":37.498,
      "lng":127.027
    }
  };type=application/json' \
  -F "file=@sample.jpg"
```

#### Response
```json
{
  "complaintNo": 101,
  "message": "민원이 성공적으로 접수되었습니다."
}
```

---

## 10.4 Dashboard Stats
### `GET /api/complaints/stats/dashboard`
기관 관리자 대시보드 통계를 조회합니다.

#### Response
```json
{
  "summary": {
    "total": 19,
    "today": 2,
    "received": 9,
    "processing": 5,
    "completed": 5,
    "sla_compliance": 47.6,
    "overdue": 10,
    "avg_processing_days": 2.0,
    "completion_rate": 22.2
  },
  "categoryStats": [],
  "monthlyTrend": [],
  "bottleneck": [],
  "bottleneckOverdue": [],
  "ageGroupStats": [],
  "overdueList": []
}
```

---

## 10.5 Auth Login
### `POST /api/auth/login`

#### Request
```json
{
  "userId": "testuser",
  "password": "password123!"
}
```

#### Response
```json
{
  "token": "[TBD]",
  "user": {
    "userId": "testuser",
    "role": "USER"
  }
}
```

---

## 10.6 Notifications
### `GET /api/notifications/subscribe?token=<JWT>`
SSE로 실시간 알림을 구독합니다.

```bash
curl -N "http://localhost:8080/api/notifications/subscribe?token=<JWT>"
```

---

## 11. Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Router, ApexCharts/Recharts, Kakao Maps |
| Backend | Spring Boot 3.4.1, MyBatis, Spring Security, JWT, Actuator |
| AI | FastAPI, SentenceTransformers, Milvus, rank_bm25, Kiwi, Whisper, YOLO, PyTorch |
| DB | PostgreSQL, PostGIS |
| Storage | AWS S3 with local uploads fallback |
| Infra | Docker Compose, Nginx, Milvus, Etcd, MinIO |
| Observability | Prometheus metrics endpoints |
| Dev Tools | Gradle Wrapper, npm, Docker |

---

## 12. Why these technologies?

| 기술 | 사용 이유 |
|---|---|
| Spring Boot | 인증, 도메인 로직, 대시보드/GIS API를 안정적으로 구성하기 쉬움 |
| MyBatis | 통계성 쿼리와 조건별 목록 조회를 SQL 중심으로 세밀하게 제어 가능 |
| FastAPI | AI 추론 API를 빠르게 분리/서빙하기 좋고 Python 생태계와 잘 맞음 |
| Milvus | 법령 임베딩 검색을 위한 Vector DB |
| BM25 | 법령명/키워드 같은 정확한 단어 매칭 보완 |
| PostgreSQL + PostGIS | 일반 민원 데이터 + 위치 데이터(GIS)를 같이 처리 |
| Whisper | 음성 민원 텍스트화 |
| YOLO | 이미지 신고 자동 분석 |
| Docker Compose | 백엔드/AI/DB/Milvus를 한 번에 재현 가능 |

---

## 13. Reproducibility

## Requirements
- Docker / Docker Compose
- Node.js 22+
- Java 17
- Python 3.9
- PostgreSQL 16
- ffmpeg
- Kakao Maps JavaScript API Key
- AWS S3 credentials: 선택 사항

## Environment variables
루트 혹은 서비스별 환경에서 아래 키를 설정합니다.

```env
# Frontend
VITE_KAKAO_MAP_KEY=

# Backend
AI_RAG_URL=http://127.0.0.1:8001
AI_STT_URL=http://127.0.0.1:8000
AI_YOLO_URL=http://127.0.0.1:5000
AWS_S3_BUCKET=safeguard-bukket
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
JWT_SECRET=YourSuperSecretKeyForJWTTokenGenerationMustBe256BitsLong

# DB
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=safeguard

# RAG / Milvus
MILVUS_HOST=localhost
MILVUS_PORT=19530
```

---

## 14. Run with Docker Compose

레포 루트에서 실행:

```bash
docker compose up -d --build
```

상태 확인:

```bash
docker ps
```

주요 포트:
| Service | Port |
|---|---|
| Frontend (Nginx) | `80` |
| Backend | `8080` |
| STT | `8000` |
| RAG | `8001` |
| YOLO | `5001 -> 5000` |
| PostgreSQL | `5433` |
| Milvus | `19530`, `9091` |
| MinIO | `9000`, `9011` |

중지:
```bash
docker compose down
```

---

## 15. Run services individually

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
./gradlew bootRun
```

Windows:
```powershell
cd backend
.\gradlew.bat bootRun
```

### RAG
```bash
cd ai/rag
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001
```

### STT
```bash
cd ai/stt
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

### YOLO
```bash
cd ai/yolo
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 5000
```

---

## 16. RAG Index Build / Refresh

법령 인덱스를 새로 만들 때:

```bash
cd ai/rag
python ingest.py
```

간단 검증:
```bash
python verify_classification.py
python test_precision.py
```

주의:
- `rag_data/`의 PDF와 `bm25_index.pkl`이 필요합니다.
- Milvus가 먼저 떠 있어야 합니다.

---

## 17. Testing & Verification

### 1) Health check
```bash
curl http://localhost:8001/health
curl http://localhost:5001/health
curl http://localhost:8080/actuator/health
```

### 2) Sample RAG inference
```bash
curl -X POST http://localhost:8080/api/rag/analyze \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"심야 시간대 공사 소음으로 수면에 지장이 있습니다.\"}"
```

### 3) Sample image inference
```bash
curl -X POST http://localhost:8080/api/yolo/analyze \
  -F "image=@sample.jpg"
```

### 4) Dashboard API
```bash
curl http://localhost:8080/api/complaints/stats/dashboard
```

### 5) Notification stream
```bash
curl -N "http://localhost:8080/api/notifications/subscribe?token=<JWT>"
```

---

## 18. Security / Privacy / Ethics

### Data sensitivity
- 민원 본문, 위치 정보, 이미지, 음성은 모두 민감 정보가 될 수 있음
- 운영 시 개인정보/민감정보 비식별화 정책이 필요함

### Storage policy
- 이미지 업로드는 S3 우선, 실패 시 로컬 `uploads/` fallback
- 위치 데이터는 PostGIS에 저장
- 법령 RAG 데이터는 로컬 PDF + Milvus 인덱스로 관리

### Key management
- AWS 키, JWT 시크릿, Kakao 키는 환경변수로 분리
- 레포에 실제 운영 키를 커밋하지 않도록 주의

### Prompt injection / model abuse
- 본 프로젝트의 RAG는 외부 웹검색이나 tool-calling agent가 아닌 **고정 법령 코퍼스 검색 기반**
- Hard rule, threshold, confidence gating으로 오분류를 제한
- 다만 악의적 입력/장난 입력에 대한 추가 필터링은 강화 여지 있음

### Ethical considerations
- 자동 분류 결과는 보조 도구이며 최종 행정 판단을 완전히 대체하지 않음
- 짧고 모호한 민원은 `기타`로 안전하게 처리해 과잉 자동화를 피함

---

## 19. Troubleshooting

### 1. `AI RAG 서비스 연결에 실패했습니다`
원인:
- `ai-rag` 컨테이너 미기동
- Backend의 `AI_RAG_URL` 불일치

해결:
```bash
docker ps
curl http://localhost:8001/health
docker compose up -d --build ai-rag backend
```

### 2. 카카오 지도 API가 로드되지 않음
원인:
- `VITE_KAKAO_MAP_KEY` 미설정

해결:
```env
VITE_KAKAO_MAP_KEY=your_key
```
프론트 재빌드:
```bash
docker compose up -d --build frontend
```

### 3. Milvus 연결 실패
원인:
- `milvus`, `etcd`, `minio` 중 일부가 안 떠 있음

해결:
```bash
docker compose up -d milvus etcd minio
docker ps
```

### 4. `mvn` 명령이 없음
원인:
- Maven 미설치

해결:
- 이 레포는 `gradlew` 사용 가능
```bash
cd backend
./gradlew build
```
또는 Docker 사용:
```bash
docker compose up -d --build backend
```

### 5. 이미지 업로드가 S3에서 실패함
원인:
- AWS 자격 증명 미설정 또는 버킷 접근 권한 없음

해결:
- AWS 환경변수 설정
- 또는 로컬 fallback 경로(`uploads/`) 사용 여부 확인

---



