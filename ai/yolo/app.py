from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import json
from analyze_image import analyze_image
from fastapi import Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST




app = FastAPI()

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
