from fastapi import FastAPI, Request, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import re
import uvicorn
import os
import shutil
import tempfile
import whisper
import torch

try:
    import imageio_ffmpeg
    import shutil
    
    # imageio_ffmpeg에서 제공하는 원본 exe 경로
    original_ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(original_ffmpeg_exe)
    
    # Whisper는 'ffmpeg.exe'라는 이름을 기대하므로, 복사본 생성
    standard_ffmpeg_exe = os.path.join(ffmpeg_dir, "ffmpeg.exe")
    if not os.path.exists(standard_ffmpeg_exe):
        shutil.copy(original_ffmpeg_exe, standard_ffmpeg_exe)
    
    # PATH에 해당 디렉토리 추가
    if ffmpeg_dir not in os.environ["PATH"]:
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ["PATH"]
        
    print(f"--- FFMPEG 설정 완료: {standard_ffmpeg_exe} ---")
except Exception as e:
    print(f"FFMPEG 설정 중 오류: {e}")

model = whisper.load_model("base")

class UnifiedComplaintManager:
    """
    대한민국 21개 주요 기관 분류 기반 민원 처리 엔진
    Whisper STT 엔진 적용 및 기관 ID [0-20] 분류
    """

    def __init__(self):
        # 기관 리스트 및 ID 매핑
        self.AGENCIES = {
            0: "경찰청", 1: "국토교통부", 2: "고용노동부", 3: "국방부",
            4: "국민권익위원회", 5: "식품의약품안전처", 6: "대검찰청", 7: "기획재정부",
            8: "행정안전부", 9: "보건복지부", 10: "과학기술정보통신부", 11: "국세청",
            12: "기후에너지환경부", 13: "법무부", 14: "공정거래위원회", 15: "교육부",
            16: "해양수산부", 17: "농림축산식품부", 18: "소방청", 19: "인사혁신처",
            20: "기타"
        }

        # 분류를 위한 키워드 맵 (Heuristic)
        self.AGENCY_KEYWORDS = {
            0: ["경찰", "범죄", "도둑", "사기", "교통사고", "불법", "수사", "신고"],
            1: ["도로", "교통", "주택", "건설", "아파트", "철도", "고속도로", "운전면허"],
            2: ["노동", "임금", "체불", "근로", "직장", "해고", "고용"],
            3: ["군대", "국방", "군인", "병무", "예비군"],
            4: ["비리", "부패", "권익", "고충", "청렴"],
            5: ["음식", "식당", "약품", "위생", "식약처", "유통기한"],
            6: ["검찰", "기소", "검사"],
            7: ["예산", "경제", "재정"],
            8: ["행정", "안전", "정부", "민방위", "재난"],
            9: ["복지", "연금", "기초생활", "보건", "병원", "의료"],
            10: ["통신", "인터넷", "과학", "IT", "기술", "방송"],
            11: ["세금", "국세", "연말정산", "탈세"],
            12: ["환경", "쓰레기", "오염", "미세먼지", "기후", "에너지"],
            13: ["법무", "교도소", "출입국", "비자"],
            14: ["거래", "공정", "독과점", "담합"],
            15: ["학교", "교육", "선생님", "대학", "수업"],
            16: ["바다", "해양", "수산", "어선", "항구"],
            17: ["농사", "농림", "축산", "식품", "축사"],
            18: ["불", "화재", "구조", "구급", "119", "소방"],
            19: ["공무원", "인사", "채용", "공직"],
        }
        
        self.AGENCY_CATEGORIES = {
            0: "경찰/수사", 1: "교통/건설", 2: "고용/노동", 3: "국방/보훈",
            4: "행정/권익", 5: "보건/위생", 6: "검찰/법무", 7: "재정/경제",
            8: "행정/안전", 9: "보건/복지", 10: "과학/방송", 11: "세무/금융",
            12: "환경/기상", 13: "법무/이민", 14: "산업/통상", 15: "교육/학술",
            16: "해양/수산", 17: "농축/식품", 18: "소방/안전", 19: "행정/인사",
            20: "기타"
        }

    def _preprocess(self, text: str) -> str:
        return re.sub(r'\s+', ' ', text.strip())

    def _classify_agency(self, text: str) -> int:
        """텍스트 분석을 통해 0-20 사이의 기관 ID 반환"""
        for agency_id, keywords in self.AGENCY_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                return agency_id
        return 20 # 기타

    def _extract_location(self, text: str) -> str:
        admin_pattern = r'([가-힣0-9]+(?:시|구|동|읍|면|로|길))'
        context_pattern = r'([가-힣0-9]+(?:\s+[가-힣0-9]+)*)\s*(?:앞|근처|부근|옆|뒤)(?:에서|에)?'
        facility_pattern = r'([가-힣0-9]+(?:역|공원|시장|빌딩|센터|삼거리|사거리))'

        match = re.search(admin_pattern, text)
        if match: return match.group(1).strip()
        match = re.search(context_pattern, text)
        if match: return match.group(1).strip()
        match = re.search(facility_pattern, text)
        if match: return match.group(1).strip()
        
        return "위치 정보 없음"

    def _generate_title(self, text: str, agency_id: int) -> str:
        agency_name = self.AGENCIES.get(agency_id, "기타")
        # 간단한 요약
        clean_text = text.strip()
        summary = (clean_text[:15] + "...") if len(clean_text) > 15 else clean_text
        return f"[{agency_name}] {summary}"

    def process_complaint(self, text: str) -> dict:
        if not text or not text.strip():
            raise ValueError("입력 텍스트가 유효하지 않습니다.")

        cleaned_text = self._preprocess(text)
        agency_id = self._classify_agency(cleaned_text)
        location = self._extract_location(cleaned_text)
        title = self._generate_title(cleaned_text, agency_id)

        return {
            "agency_id": agency_id,
            "agency": self.AGENCIES[agency_id],
            "category": self.AGENCY_CATEGORIES.get(agency_id, "기타"),
            "title": title,
            "location": location,
            "original_text": text
        }

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost", "*"],  # React 앱 주소 및 Docker 환경 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = UnifiedComplaintManager()

# 정적 파일 및 템플릿 설정
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

class VoiceInput(BaseModel):
    text: str

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/process_voice")
async def process_voice(data: VoiceInput):
    text = data.text
    if not text:
        raise HTTPException(status_code=400, detail="텍스트가 없습니다.")
    try:
        result = manager.process_complaint(text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_voice")
async def upload_voice(file: UploadFile = File(...)):
    print(f"--- 파일 업로드 시작: {file.filename} ({file.content_type}) ---")
    
    # 임시 파일 생성
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    print(f"임시 파일 저장 완료: {tmp_path}")

    try:
        # Whisper 엔진으로 음성 인식 수행
        print("Whisper 변환 시작...")
        # fp16=False는 CPU 환경에서 인식 오류를 방지하기 위함
        result_stt = model.transcribe(tmp_path, language="ko", fp16=torch.cuda.is_available())
        text = result_stt["text"]
        print(f"인식 성공: {text}")
        
        result = manager.process_complaint(text)
        return result
        
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"실패 상세 로그:\n{error_msg}")
        
        # ffmpeg 관련 에러인지 확인
        hint = ""
        if "ffmpeg" in str(e).lower() or "file not found" in str(e).lower():
            hint = " (시스템에 ffmpeg가 설치되어 있지 않거나 PATH에 추가되지 않았을 수 있습니다.)"
            
        raise HTTPException(status_code=500, detail=f"음성 분석 중 오류 발생: {str(e)}{hint}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
            print("임시 파일 삭제 완료")

if __name__ == '__main__':
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
