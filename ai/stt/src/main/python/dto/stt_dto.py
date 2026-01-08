from pydantic import BaseModel

class VoiceInputDTO(BaseModel):
    text: str

class SttResultDTO(BaseModel):
    stt_text: str
