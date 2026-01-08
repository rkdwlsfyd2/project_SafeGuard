import os
import re
import whisper
import torch
import logging
import traceback
import subprocess
import imageio_ffmpeg
from collections import Counter

logger = logging.getLogger(__name__)

# FFmpeg 환경 설정
try:
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    
    # Whisper는 'ffmpeg'라는 이름의 실행파일을 명시적으로 찾습니다.
    # imageio-ffmpeg의 바이너리 이름이 'ffmpeg-macos-...' 형태일 수 있으므로 
    # 'ffmpeg'라는 이름의 심볼릭 링크를 생성하여 PATH에 추가합니다.
    target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg")
    if not os.path.exists(target_ffmpeg):
        try:
            os.symlink(ffmpeg_exe, target_ffmpeg)
        except Exception:
            # 심볼릭 링크 생성이 실패할 경우 복사 시도
            import shutil
            shutil.copy2(ffmpeg_exe, target_ffmpeg)
    
    if ffmpeg_dir not in os.environ["PATH"]:
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ["PATH"]
    logger.info(f"FFmpeg environment ready: {target_ffmpeg}")
except Exception as e:
    logger.error(f"FFmpeg 설정 실패: {e}")

class SttService:
    def __init__(self):
        logger.info("Loading Whisper base model...")
        self.model = whisper.load_model("base")
        logger.info("Whisper model loaded")

    def _preprocess(self, text: str) -> str:
        """공백 정리"""
        return re.sub(r"\s+", " ", text.strip())

    def _is_repetitive_noise(self, text: str) -> bool:
        """
        의미 없는 반복 발화 감지
        예: '자자자자자', '아아아아'
        """
        tokens = re.findall(r"[가-힣]", text)
        if not tokens:
            return True

        counter = Counter(tokens)
        most_common_ratio = counter.most_common(1)[0][1] / len(tokens)
        return most_common_ratio > 0.6

    def transcribe(self, file_path: str = None, provided_text: str = None) -> dict:
        text = ""

        # 텍스트가 있으면 그대로 반환
        if provided_text and provided_text.strip():
            text = provided_text

        # 음성 파일 STT
        elif file_path:
            try:
                logger.info("Running Whisper STT...")
                # =====================================================
                # Whisper 모델 로드 (튜닝 절대 변경 없음)
                # =====================================================
                result = self.model.transcribe(
                    file_path,
                    language="ko",
                    fp16=torch.cuda.is_available(),

                    # ---- 기존 튜닝 그대로 유지 ----
                    initial_prompt="행정 민원 신고 내용입니다. 불법 주정차, 도로 파손, 쓰레기 투기, 노점상 단속 등 민원 키워드를 중심으로 인식해 주세요.",
                    beam_size=5,
                    condition_on_previous_text=False,
                    no_speech_threshold=0.6,
                    logprob_threshold=-1.0
                )

                text = result.get("text", "").strip()
                segments = result.get("segments", [])

                # 무음 가드
                if not segments:
                    raise ValueError("음성 인식 결과가 없습니다.")

                avg_no_speech_prob = sum(
                    seg.get("no_speech_prob", 0) for seg in segments
                ) / len(segments)

                if avg_no_speech_prob > 0.95 and len(text.strip()) < 5:
                    raise ValueError("무음으로 판단되었습니다.")

                logger.info(f"raw_stt_output: {text}")

            except Exception as e:
                logger.error(traceback.format_exc())
                raise RuntimeError(f"STT 실패: {e}")

        else:
            raise ValueError("음성 또는 텍스트 입력이 필요합니다.")

        if not text.strip():
            raise ValueError("음성 인식 결과가 없습니다.")

        cleaned = self._preprocess(text)

        # Whisper가 무음 상황 등에서 initial_prompt를 그대로 반환하는 경우(환각) 방지
        # 튜닝 내역은 건드리지 않고 결과만 필터링합니다.
        prompt_text = "행정 민원 신고 내용입니다. 불법 주정차, 도로 파손, 쓰레기 투기, 노점상 단속 등 민원 키워드를 중심으로 인식해 주세요."
        if cleaned.strip() == prompt_text.strip() or (len(cleaned) > 10 and prompt_text.startswith(cleaned[:20])):
             raise ValueError("유효한 발화가 감지되지 않았습니다.")

        # 반복 발화 가드
        if self._is_repetitive_noise(cleaned):
            raise ValueError("의미 없는 반복 발화로 판단되었습니다.")

        # 너무 짧은 발화 가드
        if len(cleaned) < 3:
            raise ValueError("유효한 발화가 감지되지 않았습니다.")

        return {
            "stt_text": cleaned
        }

    def process_voice_file(self, tmp_input: str) -> dict:
        import tempfile
        import os

        tmp_processed = tempfile.mktemp(suffix=".wav")
        try:
            ffmpeg_cmd = [
                imageio_ffmpeg.get_ffmpeg_exe(),
                "-i", tmp_input,
                "-af", "afftdn",
                "-ar", "16000",
                "-ac", "1",
                "-y", tmp_processed
            ]
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True)

            return self.transcribe(file_path=tmp_processed)
        finally:
            if os.path.exists(tmp_processed):
                os.remove(tmp_processed)
