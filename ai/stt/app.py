import os
import sys

# 프로젝트 루트를 path에 추가하여 src 패키지를 찾을 수 있게 함
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# uvicorn app:app 호출을 위해 app 객체를 expose함
from src.main.python.main import app

if __name__ == "__main__":
    import uvicorn
    # 직접 실행 시에도 동일하게 작동
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)