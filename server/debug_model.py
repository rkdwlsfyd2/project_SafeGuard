from ultralytics import YOLO
import sys
import os

# 한글 출력 대응
sys.stdout.reconfigure(encoding='utf-8')

def debug_image(image_path):
    model_path = "best.pt"
    if not os.path.exists(model_path):
        print("best.pt file not found.")
        return

    model = YOLO(model_path)
    # 낮은 conf로 모든 검출 확인
    results = model(image_path, conf=0.05) 
    
    print(f"\n=== RAW DETECTION RESULTS FOR: {os.path.basename(image_path)} ===")
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            print(f"Detected Class ID: {cls_id} | Confidence: {conf:.4f}")

if __name__ == "__main__":
    # Use the absolute path provided in context if available, otherwise argument
    if len(sys.argv) > 1:
        debug_image(sys.argv[1])
    else:
        # Fallback for testing if no arg provided, using the uploaded file path from metadata
        # User metadata says: C:/Users/sy/.gemini/antigravity/brain/185dc32d-7360-45c1-9ea4-573101975ab2/uploaded_image_1767603878854.jpg
        # But I need to access it via valid path. I will rely on arg.
        print("Please provide image path.")
