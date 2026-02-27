# SafeGuard

AI-Based Civil Complaint Service Innovation Scenario and Development Method Contest : https://sotong.go.kr/front/epilogue/epilogueNewViewPage.do?bbs_id=b39c3c4da2f74f73b5fdd9c1a7294a81&pagetype=bbs&search_result=&search_result_cnddt=&epilogue_bgnde=&epilogue_endde=&date_range=all&epilogue_bgnde_cnddt=&epilogue_endde_cnddt=&date_range_cnddt=all&search_title_contents=&search_insttNm=&miv_pageNo=1&preDate=&endDate=

[![Java 17](https://img.shields.io/badge/Java-17-blue)](#)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.1-6DB33F)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.9-009688)](#)
[![React](https://img.shields.io/badge/React-Vite%20%2B%20TS-61DAFB)](#)
[![Milvus](https://img.shields.io/badge/VectorDB-Milvus-00B3A4)](#)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20PostGIS-336791)](#)

An AI-first civil complaint platform powered by multimodal AI.  
Users can submit complaints in text, voice, or image form, and the system recommends the responsible public agency and complaint type, then connects that result to backend workflows, GIS dashboards, and notifications.

- Demo: None
- Screenshots: See images in this repository / project docs
- Team or Individual: Team
- My Role: AI YOLO, Backend, Frontend, Notification Service
- Development Period: 2025.12.02~2026.01.27

## Why it matters
- Users do not need to know the responsible agency before filing a complaint.
- Operators can track agency-level workload, overdue complaints, GIS distributions, and SLA metrics in one place.
- The core value is not just the UI, but the fact that **RAG + YOLO + Whisper** are integrated into the actual product flow.

---

## 1. Project Overview

### One-liner
**SafeGuard is an AI-first complaint handling platform that combines law-based RAG, object detection, and speech-to-text to route public complaints to the appropriate agency.**

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
Civil complaints are often short and ambiguous, so end users struggle to decide which agency should handle them.  
For example, a complaint such as "construction noise late at night" may overlap construction, road, and environmental domains.

### Input / Output
| Type | Input | Output |
|---|---|---|
| Text AI | Complaint title/content | Agency, category, confidence, reasoning, source documents |
| Voice AI | Audio file | Transcribed text + text-based agency classification |
| Image AI | Complaint image | Detected type + recommended agency |
| Operations AI | Complaint events | Dashboard metrics, GIS visualization, user notifications |

---

## 3. AI Pipeline Summary

| Module | Problem | Approach | Core libraries/models | Serving |
|---|---|---|---|---|
| RAG classifier | Free-text complaint -> agency recommendation | Hybrid retrieval + rule-based scoring | `sentence-transformers`, `Milvus`, `rank_bm25`, `kiwipiepy` | FastAPI |
| STT | Voice complaint -> text | Whisper-based speech recognition | `openai-whisper`, `torch`, `ffmpeg` | FastAPI |
| Image AI | Complaint image -> type/agency | YOLO object detection | `ultralytics`, `torch`, `opencv-python-headless` | FastAPI |

---

## 4. AI Detail

### 4.1 Text RAG Classifier

#### What it does
The text classifier retrieves related laws and regulations, combines retrieval results with domain-specific rules, and decides the final responsible agency.

#### Approach
- Model type: **RAG-based classification system**
- Style: **retrieval + scoring + rule-based decision**, not a generative agent
- LangChain: **not used**
- Implementation: FastAPI + custom retrieval/scoring pipeline

#### Retrieval strategy
1. Receive complaint text
2. Apply hard rules
   - Example: illegal parking keywords are strongly routed to the National Police Agency
3. Run hybrid retrieval
   - Vector search: `paraphrase-multilingual-MiniLM-L12-v2`
   - Keyword search: Kiwi morphological analysis + BM25
4. Re-rank with RRF (Reciprocal Rank Fusion)
5. Aggregate scores by agency
6. Apply guardrails
   - Reduce the impact of overly broad laws
   - Return `Other` if confidence is below threshold
7. Return agency/category/source documents

#### Why this design
- Keyword rules alone are too brittle for varied user phrasing
- Pure vector search is weaker at exact law title and terminology matching
- This project therefore uses **semantic search + lexical search + domain rules** together

#### Embedding / Search
| Item | Value |
|---|---|
| Embedding model | `paraphrase-multilingual-MiniLM-L12-v2` |
| Vector dimension | 384 |
| Vector DB | Milvus |
| Keyword Search | BM25 |
| Tokenizer | Kiwi |
| Fusion | RRF |

#### Data
| Item | Description |
|---|---|
| Source | Public law/regulation PDFs in `ai/rag/rag_data` |
| Scale | **86 law PDFs** |
| Auxiliary data | `complaint_examples.md`, BM25 index file |
| Preprocessing | PDF text extraction, chunking, embedding generation, Milvus ingestion, BM25 indexing |
| Chunking | Overlap-based chunking to preserve context across neighboring segments |

#### Training / Indexing Flow
```text
Collect PDF files
→ Extract text with pdfplumber
→ Split into chunks
→ Generate embeddings with sentence-transformers
→ Insert into Milvus
→ Build BM25 index
```

#### Inference Flow
```text
User text
→ Hard Rule
→ Vector Search + BM25
→ RRF fusion
→ Agency scoring
→ Guardrail / Threshold
→ Agency / Category / Sources
```

#### Sample response
```json
{
  "agency_code": 30,
  "agency_name": "Ministry of Climate, Energy and Environment",
  "category": "Environment",
  "confidence": 0.82,
  "reasoning": "Noise and construction keywords matched retrieved noise-control laws",
  "sources": [
    "Noise and Vibration Control Act (...).pdf",
    "Noise and Vibration Control Act Enforcement Decree (...).pdf"
  ],
  "message": "Success"
}
```

---

### 4.2 Speech-to-Text

#### What it does
The STT service transcribes voice complaints into text and passes the result into the complaint workflow.

#### Model / Library
- Model type: STT
- Model: **OpenAI Whisper `base`**
- Libraries: `openai-whisper`, `torch`, `imageio-ffmpeg`

#### Design notes
- Uses the `base` model
- Fixes ffmpeg path at runtime
- Includes filters for low-information, silent, or repetitive transcriptions
- Falls back to keyword-based routing if the RAG service is unavailable

#### Inference Flow
```text
Audio upload
→ ffmpeg processing
→ Whisper transcription
→ anti-hallucination / repetition filtering
→ RAG classification call
→ text + recommended agency
```

---

### 4.3 Image Analysis

#### What it does
The image service performs object detection and maps the result to a complaint type and responsible agency.

#### Model / Library
- Model type: Object detection
- Libraries: `ultralytics`, `torch`, `opencv-python-headless`
- Weight files: `best.pt`, `infer_image_complaint.pt`, `5k_each.pt`

#### Inference Flow
```text
Image upload
→ content-type / size validation
→ temporary file save
→ YOLO inference
→ type/agency mapping
→ JSON response
```

#### Sample response
```json
{
  "type": "Illegal Parking",
  "agency": "National Police Agency",
  "message": "success"
}
```

---

## 5. Model Card

### Model Card: RAG Classifier
| Item | Description |
|---|---|
| Purpose | Classify free-text complaints into agency and category |
| Input | Korean complaint text |
| Output | Agency, agency code, category, confidence, reasoning, sources |
| Data | 86 law PDFs + example complaint text |
| Retrieval | Milvus + BM25 |
| Metrics | [TBD] |
| Risks | Short/ambiguous queries, overly broad laws, stale regulation corpus |
| Mitigation | Hard rules, thresholding, broad-law penalty, MOIS guard, fallback |

### Model Card: Whisper STT
| Item | Description |
|---|---|
| Purpose | Transcribe voice complaints into text |
| Input | Audio file |
| Output | Korean transcription |
| Model | Whisper `base` |
| Metrics | [TBD] |
| Caveats | Noise, silence, dialects, and short utterances can degrade quality |

### Model Card: YOLO Detector
| Item | Description |
|---|---|
| Purpose | Infer complaint type from an uploaded image |
| Input | Complaint image |
| Output | Complaint type, recommended agency |
| Model | YOLO-family weights included in repo |
| Metrics | [TBD] |
| Caveats | Quality may drop for unseen classes, low light, occlusion, or long distance |

---

## 6. Evaluation

### Metrics
| Module | Metrics | Result |
|---|---|---|
| RAG classification | Accuracy / F1 / Top-k Recall | [TBD] |
| STT | WER / CER | [TBD] |
| YOLO | mAP / Precision / Recall | [TBD] |
| System | API latency / uptime / cost | [TBD] |

### Error Analysis
1. **Construction noise misclassification**
   - Example: "construction noise late at night"
   - Failure: biased toward construction/transport agencies
   - Cause: the keyword `construction` can dominate environmental context
   - Mitigation: stronger weighting for noise/vibration/environment terms

2. **Overweight broad administrative laws**
   - Failure: ambiguous complaints collapse into the Ministry of the Interior and Safety
   - Cause: generic administrative laws overlap with many complaint topics
   - Mitigation: broad-law penalty and MOIS guard

3. **Short and vague texts**
   - Example: "It is too loud"
   - Failure: low confidence
   - Mitigation: safe fallback to `Other`

---

## 7. Limitations & Next Steps

### Current limitations
1. The law-based RAG is useful, but it does not fully encode internal agency operating rules
2. Updating the regulation corpus requires re-indexing
3. STT quality can drop with noisy or very short audio
4. YOLO class definitions are not fully documented at the README level
5. Quantitative evaluation numbers are not yet fully documented
6. Reasoning output is still limited compared with a more explanation-oriented generation system
7. S3 fallback works locally, but deployment consistency still needs validation
8. Privacy / de-identification policy for complaint text is [TBD]

### Roadmap
1. **P1**: Build a labeled complaint benchmark and publish RAG evaluation metrics
2. **P1**: Automate law/regulation ingestion and index refresh
3. **P1**: Expand the knowledge base to include agency operating rules
4. **P2**: Build an STT benchmark and improve robustness to noise
5. **P2**: Document YOLO classes and add mAP reporting
6. **P2**: Add a user-feedback-based active learning loop
7. **P3**: Automate E2E tests for notifications and dashboard events
8. **P3**: Strengthen privacy masking and audit logging

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
- Text complaint submission
- Voice complaint submission with STT transcription
- Image-based complaint analysis
- Kakao Maps-based location selection
- Complaint list and detail pages
- Reaction / like features
- My complaints page
- Notifications when status or answer changes

### AI-facing features
- Law-based agency recommendation
- Hybrid retrieval with Milvus + BM25
- Hard rules + threshold + guardrails to reduce misclassification
- Whisper-based Korean speech transcription
- YOLO-based image classification / detection
- Dashboard metrics for SLA and overdue complaints

---

## 10. Major APIs

## 10.1 RAG Analysis
### `POST /api/rag/analyze`
Analyze complaint text and return the recommended agency and category.

#### Request
```json
{
  "text": "Construction noise late at night is seriously disrupting sleep."
}
```

#### Response
```json
{
  "agency_code": 30,
  "agency_name": "Ministry of Climate, Energy and Environment",
  "category": "Environment",
  "confidence": 0.82,
  "reasoning": "Retrieved laws related to noise/vibration matched the complaint context",
  "sources": [
    "Noise and Vibration Control Act (...).pdf"
  ],
  "message": "Success"
}
```

---

## 10.2 Image Analysis
### `POST /api/yolo/analyze`
Upload an image and get the complaint type / agency recommendation.

#### Request
```bash
curl -X POST http://localhost:8080/api/yolo/analyze \
  -F "image=@sample.jpg"
```

#### Response
```json
{
  "type": "Illegal Parking",
  "agency": "National Police Agency",
  "message": "success"
}
```

---

## 10.3 Complaint Create
### `POST /api/complaints`
Create a complaint using `multipart/form-data` with JSON payload and an optional file.

#### Request
```bash
curl -X POST http://localhost:8080/api/complaints \
  -H "Authorization: Bearer <JWT>" \
  -F 'complaint={
    "title":"Roadside trash",
    "content":"Trash has been left on the road for a long time.",
    "category":"Environment",
    "isPublic":true,
    "agencyCode":30,
    "location":{
      "address":"123 Teheran-ro, Gangnam-gu, Seoul",
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
  "message": "Complaint submitted successfully."
}
```

---

## 10.4 Dashboard Stats
### `GET /api/complaints/stats/dashboard`
Get agency admin dashboard statistics.

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
Subscribe to real-time notifications over SSE.

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

| Technology | Why it is used |
|---|---|
| Spring Boot | Stable application framework for auth, domain logic, dashboard, and GIS APIs |
| MyBatis | Fine-grained SQL control for filtering and dashboard statistics |
| FastAPI | Lightweight and practical for Python AI inference services |
| Milvus | Vector database for law retrieval |
| BM25 | Complements semantic search with exact-term matching |
| PostgreSQL + PostGIS | Handles both transactional complaint data and spatial GIS data |
| Whisper | Converts voice complaints into text |
| YOLO | Handles image-based complaint analysis |
| Docker Compose | Reproducible multi-service local environment |

---

## 13. Reproducibility

## Requirements
- Docker / Docker Compose
- Node.js 22+
- Java 17
- Python 3.9
- PostgreSQL 16
- ffmpeg
- Kakao Maps JavaScript API key
- AWS S3 credentials: optional

## Environment variables
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

From the repository root:

```bash
docker compose up -d --build
```

Check containers:

```bash
docker ps
```

Ports:
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

Stop:
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

To rebuild the regulation index:

```bash
cd ai/rag
python ingest.py
```

Quick verification:
```bash
python verify_classification.py
python test_precision.py
```

Notes:
- `rag_data/` PDFs and `bm25_index.pkl` are required.
- Milvus must be running first.

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
  -d "{\"text\":\"Construction noise late at night is disrupting sleep.\"}"
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
- Complaint text, location, images, and voice can all contain sensitive information
- A production deployment would need explicit de-identification and retention policies

### Storage policy
- Images are uploaded to S3 first and fall back to local `uploads/` storage
- Location data is stored in PostGIS
- RAG data is stored as local PDFs plus Milvus vector index

### Key management
- AWS keys, JWT secrets, and Kakao keys are separated via environment variables
- Real production secrets should not be committed

### Prompt injection / model abuse
- This RAG stack uses a fixed law corpus rather than open web search or tool-calling agents
- Hard rules, thresholds, and confidence gating are used to reduce bad routing
- Additional abuse filtering can still be improved

### Ethical considerations
- The AI output is an assistive recommendation, not a replacement for final administrative judgment
- Ambiguous complaints are safely routed to `Other` instead of forcing overconfident automation

---

## 19. Troubleshooting

### 1. `Failed to connect to AI RAG service`
Cause:
- `ai-rag` container is not running
- Backend `AI_RAG_URL` does not match runtime

Fix:
```bash
docker ps
curl http://localhost:8001/health
docker compose up -d --build ai-rag backend
```

### 2. Kakao Maps does not load
Cause:
- `VITE_KAKAO_MAP_KEY` is missing

Fix:
```env
VITE_KAKAO_MAP_KEY=your_key
```
Rebuild frontend:
```bash
docker compose up -d --build frontend
```

### 3. Milvus connection failure
Cause:
- `milvus`, `etcd`, or `minio` is not running

Fix:
```bash
docker compose up -d milvus etcd minio
docker ps
```

### 4. `mvn` command not found
Cause:
- Maven is not installed

Fix:
- This project can be built with the Gradle wrapper
```bash
cd backend
./gradlew build
```
Or via Docker:
```bash
docker compose up -d --build backend
```

### 5. S3 image upload fails
Cause:
- Missing AWS credentials or insufficient bucket permissions

Fix:
- Set AWS environment variables correctly
- Or confirm the local fallback path `uploads/` is available

---

