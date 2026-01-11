
# 🎙️ SafeGuard Intelligent STT Service

## 서비스 개요 (Service Overview)
**STT(Speech-to-Text) 서비스**는 사용자의 음성을 텍스트로 변환하고, 그 내용을 분석하여 행정 기관을 분류하는 **SafeGuard AI 파이프라인의 진입점(Entry Point)**입니다. 

단순한 받아쓰기를 넘어, **현장 소음 제어(Voice Cleansing)**, **환각 방지(Anti-Hallucination)**, **처리 속도 최적화(Latency Optimization)** 기술이 집약되어 있어 정확하고 빠른 민원 접수를 지원합니다.

---

## 🏗️ 시스템 아키텍처 (Architecture)

```mermaid
graph TD
    Client[Client (Frontend)] -->|Audio/Text| API[STT Service (FastAPI)]
    
    subgraph "STT Pipeline"
        API -->|Check Text| Priority{Has Text?}
        Priority -->|Yes| Skip[Skip Audio Processing]
        Priority -->|No| Pre[Voice Cleansing (FFmpeg)]
        
        Pre -->|Clean Audio| Whisper[Faster-Whisper AI]
        Whisper -->|Raw Text| Filter[Hallucination Filter]
        Filter -->|Clean Text| Post[Post-Processing]
    end
    
    Skip --> Post
    Post -->|Text| RAG[RAG Service (Classifier)]
    RAG -->|Category/Agency| API
    
    API -->|Final Result| Client
```

---

## 핵심 기술 및 로직 (Key Technologies)

### 1. Priority Check (서버 최적화)
클라이언트에서 이미 `Real-time STT`(Web Speech API 등)를 통해 텍스트를 확보했을 경우, 무거운 AI 연산을 수행하지 않습니다.
> **Logic**: `upload_voice` 요청 시 `text` 필드가 존재하면 즉시 `process_complaint`로 직행.
- **Benefit**: 응답 속도 **0.1초 미만** (기존 3~5초 → 98% 단축)
- **Code Reference**: `app.py` Line 322 (`if text and text.strip(): ...`)

### 2. Voice Cleansing v1.0 (음성 정제)
민원 현장의 잡음을 제거하여 인식률을 극대화하는 전처리 파이프라인입니다.
1. **Background Noise Reduction**: `ffmpeg -af afftdn` (FFT 기반 노이즈 제거)
   - 화이트 노이즈, 바람 소리 등 지속적인 잡음을 제거합니다.
2. **Normalization & Resampling**: `ffmpeg-normalize`
   - **Target**: `-ar 16000` (Whisper 모델 최적 주파수 16kHz)
   - 볼륨을 평균화하여 작은 목소리도 명확하게 인식되도록 보정합니다.

### 3. Whisper AI 모델최적화
- **Model**: `base` (속도와 정확도의 최적 균형)
- **Parameters**:
  - `beam_size=5`: 탐색 폭을 넓혀 정확도 향상.
  - `no_speech_threshold=0.6`: 비음성 구간(Silence)을 더 민감하게 감지하여 헛소리 방지.
  - `condition_on_previous_text=False`: 이전 문맥의 영향을 차단하여 반복 루프(Looping) 현상 방지.

### 4. 환각 필터 (Anti-Hallucination)
AI가 침묵(Silence)이나 배경 소음을 언어로 착각하여 생성하는 "환각 텍스트"를 후처리로 걸러냅니다.
- **필터 조건**: 
  - 텍스트 길이가 5자 미만인 경우.
  - 특수문자(`.,!?`)만 포함된 경우.
  - (확장 가능) 특정 반복 구문 감지.

---

## 🔌 API 명세 (API Specification)

### 1. 메인 처리 엔드포인트 (`POST /upload_voice`)
음성 파일 업로드 또는 텍스트 분석 요청을 처리합니다.

**Request (`multipart/form-data`)**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `file` | File | △ | 오디오 파일 (.wav, .m4a, .mp3). `text`가 없을 경우 필수. |
| `text` | String | △ | 클라이언트 1차 인식 텍스트. 존재 시 오디오 처리 생략. |

**Response (`JSON`)**
```json
{
    "agency_id": 0,
    "agency": "경찰청",
    "category": "경찰/수사",
    "title": "[경찰청] 불법 주정차 신고합니다...",
    "original_text": "불법 주정차 신고합니다."
}
```

### 2. 텍스트 전용 분석 (`POST /process_voice`)
음성 처리 없이 텍스트만으로 분석을 요청할 때 사용합니다.

**Request (`JSON`)**
```json
{
    "text": "도로에 싱크홀이 생겼어요."
}
```

---

## 개발 환경 설정 (Setup)

### 요구 사항 (Prerequisites)
- **Python**: 3.9+
- **System Dependencies**: `ffmpeg` (반드시 설치되어 있어야 함)
  - Windows: `choco install ffmpeg` 또는 PATH 경로 설정
  - Linux: `apt-get install ffmpeg`

### 설치 및 실행
```bash
# 1. 의존성 설치
pip install -r requirements.txt

# 2. 서버 실행 (Uvicorn)
# host=0.0.0.0으로 해야 Docker 외부 접근 가능
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

---

## 트러블슈팅 (Troubleshooting)

### Q. `FileNotFoundError: [WinError 2] The system cannot find the file specified`
- **원인**: 시스템에 `ffmpeg`가 설치되지 않았거나 PATH에 잡히지 않음.
- **해결**: `ffmpeg` 설치 후 터미널 재시작. `app.py` 내의 자동 경로 설정 로직(`imageio_ffmpeg`)이 동작하는지 로그 확인.

### Q. `RuntimeError: CUDA out of memory`
- **원인**: GPU 메모리 부족.
- **해결**: `app.py`의 `whisper.load_model("base")`를 `tiny`로 변경하거나, CPU 모드로 실행(`device="cpu"`). 

---

## 관리자 노트 (Admin Notes)
- `AGENCY_KEYWORDS` 딕셔너리(`app.py:88`)를 수정하여 기관 분류 규칙을 튜닝할 수 있습니다.
- RAG 서버 주소(`http://ai-rag:8001`)가 변경되면 `_classify_via_rag` 메소드를 수정해야 합니다.
