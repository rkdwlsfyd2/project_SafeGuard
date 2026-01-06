from ultralytics import YOLO
import os
import json

def check(path, out_file):
    if os.path.exists(path):
        try:
            model = YOLO(path)
            with open(out_file, 'w', encoding='utf-8') as f:
                f.write(f"--- MODEL: {path} ---\n")
                f.write(json.dumps(model.names, indent=2))
        except Exception as e:
            with open(out_file, 'w', encoding='utf-8') as f:
                f.write(f"Error loading {path}: {e}")
    else:
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write(f"{path} not found")

check("best.pt", "best_classes.txt")
check("2class_best.pt", "2class_classes.txt")
