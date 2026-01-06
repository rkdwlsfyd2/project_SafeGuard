from fastapi import FastAPI, Request, HTTPException, File, UploadFile, Form
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
import subprocess
import requests
import sys
import logging
import imageio_ffmpeg
import traceback
import os
import shutil
import tempfile

# 기본 로깅 설정 (INFO 레벨 이상 출력, stdout으로 전송)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# 강제로 stdout 버퍼링 끄기 (실시간 로그 출력을 위해)
sys.stdout.reconfigure(line_buffering=True)


# --- ** FFMPEG 및 Whisper 모델 환경설정 ** ---
try:
    # imageio_ffmpeg에서 제공하는 원본 ffmpeg 실행 파일 경로 획득
    original_ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(original_ffmpeg_exe)
    
    # 'ffmpeg.exe'라는 정확한 이름으로 복사본 생성 ==> “ffmpeg not found” 오류 방지
    standard_ffmpeg_exe = os.path.join(ffmpeg_dir, "ffmpeg.exe")
    if not os.path.exists(standard_ffmpeg_exe):
        shutil.copy(original_ffmpeg_exe, standard_ffmpeg_exe)
    
    # 시스템 PATH에 ffmpeg 디렉토리를 추가하여 시스템 전역에서 ffmpeg를 호출할 수 있도록 설정
    if ffmpeg_dir not in os.environ["PATH"]:
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ["PATH"]
        
    print(f"--- FFMPEG 환경 설정 완료: {standard_ffmpeg_exe} ---")
except Exception as e:
    print(f"FFMPEG 설정 중 오류 발생: {e}")

# Whisper STT 모델 로드 ("base" 모델 사용, 필요에 따라 "small", "medium" 등 변경 가능)
'''
base모델 사용 이유 : 
- small 이상부터는 속도가 급격히 느려짐
- base는 실시간/서버 처리에 가장 균형이 좋음
- 민원 STT는 '대화 정확도'보다 '키워드 정확도'가 중요
'''

model = whisper.load_model("base")

# --- ** STT 결과 텍스트를 ‘행정 민원 데이터’로 바꾸는 엔진 (핵심 도메인 로직) ** ---
class UnifiedComplaintManager:
    """
    민원 텍스트 분석 및 분류 엔진
    - STT로 변환된 텍스트를 분석하여 21개 주요 행정 기관으로 자동 분류
    - 텍스트 요약(제목 생성) 기능 포함 (위치는 사용자 직접 입력)
    """

    def __init__(self):
        # Global Whisper model reference
        self.model = model
            
        # 0~20번까지의 대한민국 주요 기관 매핑
        self.AGENCIES = {
            0: "경찰청", 1: "국토교통부", 2: "고용노동부", 3: "국방부",
            4: "국민권익위원회", 5: "식품의약품안전처", 6: "대검찰청", 7: "기획재정부",
            8: "행정안전부", 9: "보건복지부", 10: "과학기술정보통신부", 11: "국세청",
            12: "기후에너지환경부", 13: "법무부", 14: "공정거래위원회", 15: "교육부",
            16: "해양수산부", 17: "농림축산식품부", 18: "소방청", 19: "인사혁신처",
            20: "기타"
        }

        # 분류 정확도를 높이기 위한 기관별 핵심 키워드 정의
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
        
        # 사용자에게 보여줄 카테고리명
        self.AGENCY_CATEGORIES = {
            0: "경찰/수사", 1: "교통/건설", 2: "고용/노동", 3: "국방/보훈",
            4: "행정/권익", 5: "보건/위생", 6: "검찰/법무", 7: "재정/경제",
            8: "행정/안전", 9: "보건/복지", 10: "과학/방송", 11: "세무/금융",
            12: "환경/기상", 13: "법무/이민", 14: "산업/통상", 15: "교육/학술",
            16: "해양/수산", 17: "농축/식품", 18: "소방/안전", 19: "행정/인사",
            20: "기타"
        }

    def _preprocess(self, text: str) -> str:
        """텍스트에서 공백을 정리하는 텍스트 전처리"""
        return re.sub(r'\s+', ' ', text.strip())
    
    def _classify_via_rag(self, text: str) -> str:
        """RAG 서버에 분류 요청을 보내 기관명을 받아옴"""
        try:
            # Docker 네트워크 내의 RAG 서버 주소
            rag_url = "http://ai-rag:8001/classify"
            response = requests.post(rag_url, json={"text": text}, timeout=10)
            if response.status_code == 200:
                result = response.json()
                agency = result.get("agency", "기타")
                
                # RAG 분석 결과 로그 출력 (사용자 요청 사항)
                reasoning = result.get("reasoning", "No reasoning provided")
                sources = result.get("sources", [])
                
                logging.info(f"\n[RAG Analysis Result]")
                logging.info(f"Agency: {agency}")
                logging.info(f"Reasoning: {reasoning}")
                logging.info(f"Sources:")
                for src in sources:
                    logging.info(f" - {src}")
                logging.info("-" * 50 + "\n")
                
                return agency
        except Exception as e:
            logging.error(f"RAG 서버 연동 실패 (기본 키워드 분류 시도): {e}")
        
        # RAG 실패 시 기본 키워드 매칭(fallback)
        agency_id = self._classify_agency_keyword(text)
        return self.AGENCIES.get(agency_id, "기타")

    def _classify_agency_keyword(self, text: str) -> int:
        """기존 키워드 기반 분류 (Fallback용)"""
        for agency_id, keywords in self.AGENCY_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                return agency_id
        return 20

    def _generate_title(self, text: str, agency_id: int) -> str:
        """민원 내용 요약 (제목 생성) - 간단히 앞부분 20자 + 기관명"""
        agency_name = self.AGENCIES.get(agency_id, "기타")
        summary = text[:20] + "..." if len(text) > 20 else text
        return f"[{agency_name}] {summary}"

    def process_complaint(self, file_path: str = None, provided_text: str = None) -> dict:
        """
        최종 민원 분석 실행 함수
        - provided_text가 있으면 우선 사용
        - 없으면 file_path의 오디오를 Whisper로 STT 변환
        - 이후 RAG 분류 및 결과 반환
        """
        text = ""
        
        # 1. 텍스트 확보 (입력 우선 or STT)
        if provided_text and provided_text.strip():
             logging.info(f"Using client-provided text: {provided_text}")
             text = provided_text
        elif file_path:
             logging.info("No client text provided, running Whisper STT...")
             try:
                # Whisper 모델로 STT 수행 (환각 방지 옵션 추가)
                result = self.model.transcribe(
                    file_path,
                    language="ko",
                    fp16=torch.cuda.is_available(),
                    initial_prompt="행정 민원 신고 내용입니다. 불법 주정차, 도로 파손, 쓰레기 투기, 노점상 단속 등 민원 키워드를 중심으로 인식해 주세요.",
                    beam_size=5,
                    condition_on_previous_text=False, # 이전 텍스트 맥락 차단 (반복/환각 방지)
                    no_speech_threshold=0.6,          # 비음성 구간 임계값 상향
                    logprob_threshold=-1.0            # 로그 확률 임계값 설정
                )
                text = result["text"]
                logging.info(f"raw_stt_output: {text}") # 원본 텍스트 로깅
             except Exception as e:
                logging.error(f"Whisper STT 실패: {e}")
                logging.error(traceback.format_exc())
                raise RuntimeError(f"음성 인식 처리 중 오류가 발생했습니다: {e}")
             finally:
                # 임시 파일 정리 (STT 내에서 처리하지 않고 호출자가 하거나 여기서 처리)
                # 여기서는 호출자(upload_voice)가 temp file을 관리하므로 삭제하지 않음?
                # 아니면 안전하게 삭제 시도. 
                # upload_voice에서 processed_path를 넘겨주므로, 이 함수 내에서 삭제할 책임은 애매함.
                # 하지만 기존 로직상 여기서 삭제하던 부분이 있었으므로 유지 여부 결정 필요.
                # 이번엔 단순히 변환만 함.
                pass
        else:
             raise ValueError("음성인식을 다시해주세요.")

        if not text or not text.strip():
            raise ValueError("음성인식을 다시해주세요.")

        cleaned_text = self._preprocess(text)
        
        # 환각 텍스트 필터링
        cleaned_text = self._filter_hallucination(cleaned_text)
        
        if not cleaned_text:
             raise ValueError("음성인식을 다시해주세요. (소음 또는 환각 필터링됨)")
        
        # 2. RAG 서버를 통한 기관 분류
        agency_name = self._classify_via_rag(cleaned_text)
        
        # 3. 결과 역매핑 (필요시 ID 매칭)
        agency_id = 20
        for aid, name in self.AGENCIES.items():
            if name in agency_name:
                agency_id = aid
                break

        title = self._generate_title(cleaned_text, agency_id)

        return {
            "agency_id": agency_id,
            "agency": agency_name,
            "category": self.AGENCY_CATEGORIES.get(agency_id, "기타"),
            "title": title,
            "original_text": text
        }

# --- FastAPI 앱 설정 ---
app = FastAPI()

# CORS 설정 (React 프론트엔드 등에서의 접근 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = UnifiedComplaintManager()
# 정적 파일(static) 및 템플릿(templates) 디렉토리 연결
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

class VoiceInput(BaseModel):
    text: str

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """메인 페이지 로드"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/process_voice")
async def process_voice(data: VoiceInput):
    """텍스트 입력을 받아 민원 분석만 수행하는 API"""
    text = data.text
    if not text:
        raise HTTPException(status_code=400, detail="텍스트가 없습니다.")
    try:
        result = manager.process_complaint(provided_text=text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_voice")
async def upload_voice(
    file: UploadFile = File(None), 
    text: str = Form(None)
):
    """
    음성 파일 업로드 -> 오디오 전처리 -> Whisper STT -> 민원 분석 API
    또는 텍스트 직접 입력 -> 민원 분석 API
    """
    if not file and not text:
        raise HTTPException(status_code=400, detail="음성 파일 또는 텍스트 입력이 필요합니다.")

    tmp_path = None
    noise_reduced_path = None
    processed_path = None

    try:
        if file:
            logging.info(f"--- 파일 업로드 시작: {file.filename} ({file.content_type}) ---")
            # 1. 업로드된 파일을 임시 저장
            suffix = os.path.splitext(file.filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                shutil.copyfileobj(file.file, tmp)
                tmp_path = tmp.name
            
            logging.info(f"임시 파일 저장 완료: {tmp_path}")

            # --- 오디오 고도화 전처리 (Noise Reduction & Normalization) ---
            processed_path = tempfile.mktemp(suffix=".wav")
            
            # 2-1. 배경 소음 제거 (FFmpeg afftdn 필터 사용)
            logging.info("배경 소음 제거 중 (-af afftdn)...")
            noise_reduced_path = tempfile.mktemp(suffix=".wav")
            ffmpeg_cmd = [
                imageio_ffmpeg.get_ffmpeg_exe(),
                "-i", tmp_path,
                "-af", "afftdn",
                "-y", noise_reduced_path
            ]
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
            
            # 2-2. 음성 볼륨 평탄화 및 리샘플링 (ffmpeg-normalize 사용)
            logging.info("음성 볼륨 평탄화 중 (ffmpeg-normalize)...")
            normalize_cmd = [
                "ffmpeg-normalize",
                noise_reduced_path,
                "-o", processed_path,
                "-ar", "16000", # Whisper 최적화를 위해 16kHz로 샘플링
                "-f"
            ]
            subprocess.run(normalize_cmd, check=True, capture_output=True)
            
            # 3. 변환된 텍스트를 민원 관리 엔진에 전달하여 분석
            result = manager.process_complaint(file_path=processed_path, provided_text=text)
        else: # Only text is provided
            logging.info(f"--- 텍스트 입력 처리 시작 ---")
            result = manager.process_complaint(provided_text=text)
        
        return result
        
    except Exception as e:
        # 에러 발생 시 상세 로그 출력
        error_msg = traceback.format_exc()
        logging.error(f"분석 실패 상세 로그:\n{error_msg}")
        
        hint = ""
        if "ffmpeg" in str(e).lower() or "file not found" in str(e).lower():
            hint = " (ffmpeg 설치 상태를 확인해 주세요.)"
            
        raise HTTPException(status_code=500, detail=f"음성 분석 중 오류 발생: {str(e)}{hint}")
    finally:
        # 원본 임시 파일 삭제
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
            logging.info("원본 임시 파일 삭제 완료")

if __name__ == '__main__':
    # 서버 실행 (uvicorn)
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
