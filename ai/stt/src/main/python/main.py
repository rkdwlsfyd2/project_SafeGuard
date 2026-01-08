from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import logging
from src.main.python.controller.stt_controller import router as stt_router

# Logging 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="SafeGuard STT Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router 등록 (Spring Boot의 Controller 등록과 유사)
app.include_router(stt_router)

if __name__ == "__main__":
    uvicorn.run("src.main.python.main:app", host="0.0.0.0", port=8000, reload=True)
