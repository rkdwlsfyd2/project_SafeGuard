
import sys
import os
import json
from ultralytics import YOLO

# 한글 출력 설정 (Windows console encoding 대응)
sys.stdout.reconfigure(encoding='utf-8')

# 모델 경로 (현재 스크립트와 같은 위치의 best.pt)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best.pt")

def analyze_image(image_path):
    # 모델 파일 존재 확인
    if not os.path.exists(MODEL_PATH):
        return {
            "type": "오류",
            "agency": "관리자 문의",
            "detected": False,
            "message": "서버에 AI 모델 파일(best.pt)이 없습니다."
        }

    # 모델 로드
    model = YOLO(MODEL_PATH)
    
    # 추론 (conf=0.4 이상만)
    results = model(image_path, conf=0.05)
    
    detected_objects = []
    
    # 민원 타입 매핑 (Training: 0=banner, 1=illegal_parking)
    CLASS_INFO = {
        0: {"type": "불법 광고물 신고", "agency": "시청 도시건축과"},
        1: {"type": "불법 주정차 신고", "agency": "구청 교통행정과"}
    }
    
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            
            if cls_id in CLASS_INFO:
                info = CLASS_INFO[cls_id]
                detected_objects.append({
                    "type": info["type"],
                    "agency": info["agency"],
                    "confidence": round(conf, 2),
                    "class_id": cls_id
                })

    # 결과 처리
    if not detected_objects:
        return {
            "type": "일반 민원",
            "agency": "통합 민원실",
            "detected": False,
            "message": "AI가 민원 요소를 찾지 못했습니다. 직접 분류를 선택해주세요."
        }
    
    # 가장 확실한(Confidence 높은) 객체를 우선 선택
    best_obj = max(detected_objects, key=lambda x: x['confidence'])
    
    return {
        "type": best_obj["type"],
        "agency": best_obj["agency"],
        "detected": True,
        "confidence": best_obj["confidence"],
        "details": detected_objects
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "이미지 경로가 필요합니다."}))
        sys.exit(1)
        
    img_path = sys.argv[1]
    try:
        result = analyze_image(img_path)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        # 예외 발생 시 JSON 포맷으로 에러 반환
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
