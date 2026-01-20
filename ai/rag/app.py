"""
rag/app.py
: RAG 서비스 API 서버

[역할]
- 외부 서비스(STT, Frontend)에서 HTTP 요청을 받아 민원 분류 기능을 제공
- RAG 로직(classification_service.py) 및 유틸리티를 래핑하여 FastAPI로 서빙
- Docker 환경에서 'ai-rag' 컨테이너로 실행됨

[주요 기능]
- POST /classify: 텍스트를 입력받아 담당 기관 분류 결과 반환
- GET /health: 서버 상태 확인

[시스템 흐름]
1. 클라이언트(프론트엔드/STT)가 요청 전송
2. FastAPI가 요청 수신 및 라우팅
3. 서비스 로직(분류) 호출
4. 결과 반환 (JSON)

[파일의 핵심목적]
- AI 분류 기능의 엔트리 포인트(Entry Point) 역할 수행
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from classification_service import classify_complaint
from milvus_client import connect_milvus
from logging_config import setup_logging
import uvicorn
import os
from fastapi import Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram
import time
from fastapi import Request




# 로깅 설정 초기화
setup_logging()

app = FastAPI()

# Prometheus 메트릭 설정
REQUEST_COUNT = Counter(
    "http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"]
)

@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    """
    모든 HTTP 요청에 대해 실행되는 미들웨어
    - 요청 처리 시간 측정 (Latency)
    - 요청 수 카운트 (Request Count)
    """
    method = request.method
    endpoint = request.url.path
    
    start_time = time.time()
    response = await call_next(request)
    latency = time.time() - start_time
    
    status_code = response.status_code
    
    # 메트릭 기록
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(latency)
    
    return response

@app.get("/metrics")
def metrics():
    """ Prometheus가 주기적으로 메트릭을 수집하는 엔드포인트 """
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

# 입력 데이터 모델 정의
class ComplaintInput(BaseModel):
    text: str

# 응답 데이터 모델 정의
class ComplaintResponse(BaseModel):
    agency_code: int
    agency_name: str
    category: str  
    confidence: float = 0.0
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
        # Milvus 연결 실패해도 서버는 유지 (재시도 로직 등 고려 가능)

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
    """
    print(f"Classification Request: {input_data.text}")
    try:
        # 민원 분류 로직 실행
        result_data = classify_complaint(input_data.text)
        
        # 결과 반환
        return ComplaintResponse(
            agency_code=result_data["agency_code"],
            agency_name=result_data["agency_name"],
            category=result_data.get("category", "기타"), 
            confidence=result_data.get("confidence", 0.0),
            reasoning=result_data.get("reasoning", ""),
            sources=result_data.get("sources", [])
        )
    except Exception as e:
        print(f"Classification Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)