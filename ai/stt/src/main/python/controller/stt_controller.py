from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from src.main.python.dto.stt_dto import VoiceInputDTO, SttResultDTO
from src.main.python.service.stt_service import SttService
import os
import shutil
import tempfile
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
stt_service = SttService()


def map_stt_exception(e: Exception):
    msg = str(e)

    if any(keyword in msg for keyword in [
        "무음",
        "유효한 발화",
        "반복 발화",
        "음성 인식 결과"
    ]):
        return HTTPException(status_code=422, detail=msg)

    return HTTPException(
        status_code=500,
        detail="STT 처리 중 서버 오류가 발생했습니다."
    )


@router.post("/process_text", response_model=SttResultDTO)
async def process_text(data: VoiceInputDTO):
    try:
        result = stt_service.transcribe(provided_text=data.text)
        return SttResultDTO(**result)
    except Exception as e:
        logger.error(f"STT process_text error: {e}")
        raise map_stt_exception(e)


@router.post("/upload_voice", response_model=SttResultDTO)
async def upload_voice(
    file: UploadFile = File(None),
    text: str = Form(None)
):
    if not file and not text:
        raise HTTPException(status_code=400, detail="음성 파일 또는 텍스트가 필요합니다.")

    tmp_input = None
    try:
        if file:
            suffix = os.path.splitext(file.filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                shutil.copyfileobj(file.file, tmp)
                tmp_input = tmp.name

            result = stt_service.process_voice_file(tmp_input)
            return SttResultDTO(**result)

        result = stt_service.transcribe(provided_text=text)
        return SttResultDTO(**result)

    except Exception as e:
        logger.error(f"STT upload_voice error: {e}")
        raise map_stt_exception(e)

    finally:
        if tmp_input and os.path.exists(tmp_input):
            os.remove(tmp_input)


@router.get("/health")
def health():
    return {"status": "ok"}