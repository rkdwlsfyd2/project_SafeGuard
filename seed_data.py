import urllib.request
import urllib.parse
import json
import random
import time

BASE_URL = "http://localhost:5000/api"

def request(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data else None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode('utf-8')}")
        return None

def main():
    # 1. Register/Login User
    user_cred = {
        "email": "dummy@test.com",
        "password": "password123",
        "name": "더미유저",
        "phone": "010-1234-5678"
    }
    
    print("🔑 로그인/회원가입 시도 중...")
    login_res = request("/auth/login", "POST", {"email": user_cred["email"], "password": user_cred["password"]})
    
    if not login_res:
        print("✨ 설조 유저 가입 진행...")
        request("/auth/register", "POST", user_cred)
        login_res = request("/auth/login", "POST", {"email": user_cred["email"], "password": user_cred["password"]})
        
    if not login_res or "accessToken" not in login_res:
        print("❌ 로그인 실패 (토큰 없음)")
        return

    token = login_res["accessToken"]
    print(f"✅ 로그인 성공! (Token 확보)")

    # 2. Generate Data
    categories = ["도로/시설물", "불법주차", "환경오염", "기타"]
    titles = [
        "도로 파손 신고합니다", "신호등이 고장났어요", "횡단보도 페인트가 지워졌어요",
        "가로등이 깜빡거립니다", "불법 주차 차량 신고", "쓰레기 무단 투기 목격",
        "보도블럭 교체 요청", "공원 벤치 파손", "소음 민원입니다", "안전 펜스 설치 요청"
    ]
    contents = [
        "빠른 조치 부탁드립니다.", "위험해 보입니다. 확인해주세요.",
        "오랫동안 방치되어 있습니다.", "지나가다가 발견해서 신고합니다.",
        "아이들이 다니는 길이라 위험합니다.", "정확한 위치는 지도에 표시했습니다."
    ]

    print("🚀 80개 더미 데이터 생성 시작...")
    
    for i in range(80):
        data = {
            "title": f"{random.choice(titles)} - {i+1}",
            "content": f"{random.choice(contents)} (자동 생성된 민원 #{i+1})",
            "category": random.choice(categories),
            "address": "서울시 강남구 테헤란로 123",
            "latitude": 37.5000 + (random.random() * 0.01),
            "longitude": 127.0300 + (random.random() * 0.01)
        }
        
        res = request("/complaints", "POST", data, token)
        if res:
            print(f"[{i+1}/80] ✅ 접수 완료: {data['title']}")
        else:
            print(f"[{i+1}/80] ❌ 실패")
        
        # Too fast requests might be flagged or cause DB issues, slight delay
        # time.sleep(0.05) 

    print("\n🎉 모든 데이터 생성 완료!")

if __name__ == "__main__":
    main()
