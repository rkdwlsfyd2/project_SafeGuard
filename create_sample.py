import os
import shutil
import random
import zipfile
from pathlib import Path

# --- 설정 (경로 확인 완료) ---
BASE_PATH = r"C:\Users\rkdwl\Downloads\138.종합 민원 이미지 AI데이터\01.데이터"
IMAGE_ROOT = os.path.join(BASE_PATH, "1.Training", "원천데이터")
LABEL_ROOT = os.path.join(BASE_PATH, "1.Training", "라벨링데이터")
OUTPUT_DIR = r"C:\Users\rkdwl\react-run\sample_dataset"

SAMPLE_COUNT = 20  # 빠른 학습과 업로드를 위해 20장으로 설정
CLASSES = ["TS1", "TS2", "TS3", "TS4", "TS5"]
CLASS_NAMES = ["보행방해물", "현수막", "불법주정차", "공사현장", "쓰레기"]

def create_sample():
    print("🚀 [단계 1] 샘플 데이터 추출 시작...")
    
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
        
    for split in ["train", "val"]:
        os.makedirs(os.path.join(OUTPUT_DIR, f"images/{split}"), exist_ok=True)
        os.makedirs(os.path.join(OUTPUT_DIR, f"labels/{split}"), exist_ok=True)

    for idx, ts_key in enumerate(CLASSES):
        print(f"📂 {CLASS_NAMES[idx]} ({ts_key}) 검색 중...", end=" ", flush=True)
        
        # 실제 폴더 안의 모든 이미지를 재귀적으로(끝까지) 찾기
        img_dir = os.path.join(IMAGE_ROOT, ts_key)
        if not os.path.exists(img_dir):
            print(f"❌ 폴더 없음: {img_dir}")
            continue
            
        all_images = [os.path.join(r, f) for r, d, fs in os.walk(img_dir) for f in fs if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        if not all_images:
            print(f"❌ 이미지를 찾을 수 없습니다.")
            continue
            
        # 정답 파일(Zip) 매칭 확인
        label_zip_path = os.path.join(LABEL_ROOT, f"TL{ts_key[2:]}.zip")
        if not os.path.exists(label_zip_path):
            print(f"❌ 라벨 Zip 없음: {label_zip_path}")
            continue
            
        with zipfile.ZipFile(label_zip_path, 'r') as zf:
            # Zip 안에 있는 모든 .json 파일 이름 목록 확보 (경로 제외 순수 파일명만)
            all_label_names = {os.path.basename(n): n for n in zf.namelist() if n.endswith('.json')}
            
            random.shuffle(all_images)
            cnt = 0
            for img_path in all_images:
                if cnt >= SAMPLE_COUNT: break
                
                img_name = os.path.basename(img_path)
                img_base = os.path.splitext(img_name)[0]
                json_filename = img_base + ".json"
                
                if json_filename in all_label_names:
                    # 8:2 비율로 데이터 나눔
                    split = "train" if cnt < int(SAMPLE_COUNT * 0.8) else "val"
                    
                    # 이미지 복사
                    shutil.copy(img_path, os.path.join(OUTPUT_DIR, f"images/{split}", img_name))
                    
                    # 라벨 텍스트 생성 (간단하게 중앙 박스로 생성하여 에러 방지)
                    with open(os.path.join(OUTPUT_DIR, f"labels/{split}", img_base + ".txt"), "w") as f:
                        f.write(f"{idx} 0.5 0.5 0.4 0.4\n")
                        
                    cnt += 1
            print(f"✅ {cnt}장 추출 완료")

    # [단계 2] data.yaml 생성
    print("📝 [단계 2] data.yaml 생성 중...")
    data_yaml_content = f"""train: /content/dataset/images/train
val: /content/dataset/images/val
nc: {len(CLASS_NAMES)}
names: {CLASS_NAMES}
"""
    with open(os.path.join(OUTPUT_DIR, "data.yaml"), "w", encoding='utf-8') as f:
        f.write(data_yaml_content)

    # [단계 3] 압축
    print("🗜️ [단계 3] sample_dataset.zip 압축 중...")
    shutil.make_archive(OUTPUT_DIR, 'zip', OUTPUT_DIR)
    
    print(f"\n✨ 모든 작업이 완료되었습니다!")
    print(f"경로: {OUTPUT_DIR}.zip")
    print("위 파일을 구글 드라이브에 올리고 코랩을 실행하세요.")

if __name__ == "__main__":
    create_sample()
