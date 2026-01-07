"""
rag/app.py
: RAG 서비스 API 서버

[역할]
- 외부 서비스(STT 등)에서 HTTP 요청을 받아 민원 분류 기능을 제공
- RAG 로직(classification_service.py)을 래핑하여 FastAPI로 서빙
- Docker 환경에서 'ai-rag' 컨테이너로 실행됨

[주요 기능]
- POST /classify: 텍스트를 입력받아 담당 기관 분류 결과 반환
- GET /health: 서버 상태 확인

[비고]
- 8001번 포트 사용
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from classification_service import classify_complaint
from milvus_client import connect_milvus
from logging_config import setup_logging
import uvicorn
import os

# Initialize logging
setup_logging()

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

class ComplaintInput(BaseModel):
    text: str

class ComplaintResponse(BaseModel):
    agency_code: int
    agency_name: str
    category: str  
    reasoning: str = ""
    sources: list = []
    message: str = "Success"

@app.on_event("startup")
async def startup_event():
    """
    서버 시작 시 실행되는 이벤트 핸들러.
    Milvus 데이터베이스 연결을 시도합니다.
    """
    print("Startup: Connecting to Milvus...")
    try:
        connect_milvus()
        print("Milvus Connected")
    except Exception as e:
        print(f"Failed to connect to Milvus: {e}")
        # Milvus가 나중에 실행되거나 특정 요청에만 필요할 수 있으므로 여기서 종료하지 않음

@app.get("/health")
def health_check():
    """
    서버 상태 확인(Health Check) 엔드포인트.
    """
    return {"status": "ok"}

@app.post("/classify", response_model=ComplaintResponse)
async def classify_text(input_data: ComplaintInput):
    """
    민원 텍스트를 입력받아 담당 기관을 분류하는 엔드포인트.
    
    Args:
        input_data (ComplaintInput): 민원 내용 텍스트
        
    Returns:
        ComplaintResponse: 분류된 담당 기관명 및 상태 메시지
    """
    print(f"Classification Request: {input_data.text}")
    try:
        # classify_complaint 로직:
        # 1. Milvus에 질문 조회
        # 2. 문서 출처별 기관 카운팅
        # 3. 최적의 기관명 반환
        result_data = classify_complaint(input_data.text)
        
        # result_data는 dict {agency_code, agency_name, reasoning, sources} 형태
        return ComplaintResponse(
            agency_code=result_data["agency_code"],
            agency_name=result_data["agency_name"],
            category=result_data.get("category", "기타"), # Added category mapping
            reasoning=result_data.get("reasoning", ""),
            sources=result_data.get("sources", [])
        )
    except Exception as e:
        print(f"Classification Error: {e}")
        # 에러 발생 시, "기타"를 반환하거나 500 에러를 발생시킬 수 있음
        # 현재는 호출자가 문제를 인지할 수 있도록 HTTPException을 발생시킴
        # 또는 안정성을 위해 기본값을 반환할 수도 있음.
        # STT 앱은 예외 발생 시 키워드 검색으로 대체하므로 500 에러도 괜찮음.
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)