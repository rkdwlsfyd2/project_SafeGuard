from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import json
from analyze_image import analyze_image
from fastapi import Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram
import time
from fastapi import Request



from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

app = FastAPI()

# Prometheus Metrics
REQUEST_COUNT = Counter(
    "http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"]
)

@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    method = request.method
    endpoint = request.url.path
    
    start_time = time.time()
    response = await call_next(request)
    latency = time.time() - start_time
    
    status_code = response.status_code
    
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(latency)
    
    return response

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# CORS 설정 (모든 도메인 허용 - 개발/배포 편의)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze-image")
async def analyze(image: UploadFile = File(...)):
    # 1. 파일 형식 검증
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    # 2. 용량 검증 (5MB 제한)
    MAX_SIZE = 5 * 1024 * 1024
    image_data = await image.read()
    if len(image_data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="이미지 용량은 5MB 이하만 업로드 가능합니다.")
    
    # read() 이후 파일 포인터를 다시 처음으로 되돌림 (shutil.copyfileobj 사용을 위해)
    await image.seek(0)
    
    # Frontend sends 'image' as form field name
    file = image 
    temp_file = f"temp_{file.filename}"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        result = analyze_image(temp_file)
        return result
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

@app.get("/api/reports")
def get_reports():
    # Mock Data for List Page
    return [
        {"id": 1, "title": "보행방해물", "region": "서울시 강남구(수정해야함. 현재 하드코딩 돼있음.)", "date": "2024-05-01", "interested": 5},
        {"id": 2, "title": "현수막", "region": "경기도 성남시(수정해야함. 현재 하드코딩 돼있음.)", "date": "2024-05-02", "interested": 3},
        {"id": 3, "title": "불법주정차", "region": "부산시 해운대구(수정해야함. 현재 하드코딩 돼있음.)", "date": "2024-05-03", "interested": 12},
        {"id": 4, "title": "공사현장", "region": "부산시 해운대구(수정해야함. 현재 하드코딩 돼있음.)", "date": "2024-05-03", "interested": 12},
        {"id": 5, "title": "쓰레기 무단 투기", "region": "부산시 해운대구(수정해야함. 현재 하드코딩 돼있음.)", "date": "2024-05-03", "interested": 12},
    ]

@app.get("/health")
def health():
    return {"status": "ok"}