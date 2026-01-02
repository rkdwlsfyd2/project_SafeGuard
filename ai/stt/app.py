from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "stt"}

@app.post("/stt")
def stt_mock():
    # 추후 실제 STT 모델(Whisper 등) 연동 예정
    return {"text": "이것은 테스트 음성 인식 결과입니다."}
