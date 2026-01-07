from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import whisper
import torch
import tempfile
import shutil
import os
import subprocess
import imageio_ffmpeg
import logging

# ======================
# 기본 설정
# ======================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS (프론트엔드 연동용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================
# Whisper 모델 로드
# ======================
"""
base 모델 선택 이유
- 서버 처리 속도 / 정확도 균형
- 민원 서비스는 키워드 정확도가 핵심
"""
model = whisper.load_model("base")

# ======================
# STT API
# ======================
@app.post("/upload_voice")
async def upload_voice(file: UploadFile = File(...)):
    """
    음성 파일 업로드
    → ffmpeg 전처리
    → Whisper STT
    → 텍스트만 반환
    """
    tmp_path = None
    processed_path = None

    try:
        # 1. 업로드 파일 임시 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        logger.info(f"Temp audio saved: {tmp_path}")

        # 2. ffmpeg 전처리 (16kHz 리샘플링)
        processed_path = tempfile.mktemp(suffix=".wav")
        ffmpeg_cmd = [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-i", tmp_path,
            "-ar", "16000",
            "-ac", "1",
            "-y", processed_path
        ]
        subprocess.run(ffmpeg_cmd, check=True)

        # 3. Whisper STT
        result = model.transcribe(
            processed_path,
            language="ko",
            fp16=torch.cuda.is_available(),
            condition_on_previous_text=False,
            no_speech_threshold=0.6
        )

        text = result.get("text", "").strip()
        if not text:
            raise ValueError("음성 인식 결과가 없습니다.")

        return {
            "stt_text": text
        }

    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # 임시 파일 정리
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        if processed_path and os.path.exists(processed_path):
            os.remove(processed_path)


# ======================
# Health Check (선택)
# ======================
@app.get("/health")
def health():
    return {"status": "ok"}