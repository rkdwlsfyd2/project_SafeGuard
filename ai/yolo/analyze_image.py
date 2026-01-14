import os
import sys
import json

# YOLO 관련 잡다한 로그 억제 (최상단 배치)
os.environ['ULTRALYTICS_VERBOSE'] = 'False'
os.environ['YOLO_VERBOSE'] = 'False'

from ultralytics import YOLO

# 한글 로그 출력용 함수 (stderr 사용)
def log_korean(message):
    sys.stderr.write(f"[AI 분석 로그] {message}\n")
    sys.stderr.flush()

def analyze_image(image_path):
    log_korean(f"이미지 분석을 시작합니다. 대상 파일: {image_path}")
    
    # 1. 모델 로드
    model_path = os.path.join(os.path.dirname(__file__), 'infer_image_complaint.pt')
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"모델 파일(best.pt)을 찾을 수 없습니다: {model_path}")
    
    log_korean("학습된 YOLO 모델을 로드 중입니다...")
    model = YOLO(model_path)
    
    # 2. 이미지 분석 (Inference)
    log_korean("객체 탐지 및 이미지 분석을 수행 중입니다...")
    # results = model(image_path, conf=0.1, verbose=False) # 신뢰도 0.1 이상만 탐지, 로그 억제
    results = model.predict(
        source=image_path,
        conf=0.1,
        iou=0.5,
        imgsz=640,
        verbose=False
    )
    
    # 기관 매핑 정보
    AGENCY_MAP = {
        '보행방해물': '국토교통부',
        '현수막': '행정안전부',
        '불법주정차': '경찰청',
        '공사현장': '행정안전부',
        '쓰레기': '기후에너지환경부'
    }
    
    # 3. 결과 정리
    boxes = results[0].boxes

    if boxes is not None and len(boxes) > 0:
        # conf 값이 가장 높은 객체 선택
        best_idx = boxes.conf.argmax()
        best_box = boxes[best_idx]

        class_id = int(best_box.cls[0])
        class_name = model.names[class_id]
        confidence = float(best_box.conf[0])

        agency = AGENCY_MAP.get(class_name, '지자체 민원실')

        log_korean(f"분석 완료: {class_name} 탐지 (신뢰도: {confidence*100:.1f}%)")
        log_korean(f"추천 처리 기관: {agency}")

        return {
            "type": class_name,
            "agency": agency,
            "confidence": confidence
        }
    else:
        log_korean("탐지된 객체가 없습니다.")
        return {
            "type": "탐지 불가",
            "agency": "지자체 민원실 (수동 확인 필요)",
            "confidence": 0.0
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write(json.dumps({"error": "No image path provided"}) + "\n")
        sys.exit(1)
        
    image_path = sys.argv[1]
    try:
        analysis_result = analyze_image(image_path)
        # 최종 JSON 결과만 stdout에 출력
        print(json.dumps(analysis_result, ensure_ascii=False))
    except Exception as e:
        log_korean(f"오류 발생: {str(e)}")
        # 에러 발생 시에도 JSON 형태로 에러 정보 반환
        sys.stderr.write(json.dumps({"error": str(e)}) + "\n")
        sys.exit(1)
