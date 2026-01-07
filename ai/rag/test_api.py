from fastapi.testclient import TestClient
from app import app
from unittest.mock import patch

client = TestClient(app)

# 테스트 중 실제 Milvus 연결을 피하기 위해 의존성 모의(Mock) 처리
@patch("app.classify_complaint")
def test_classify_endpoint(mock_classify):
    """
    /classify 엔드포인트를 테스트합니다.
    Milvus 연결을 Mocking하여 API 동작만 독립적으로 검증합니다.
    """
    # Mock 반환값 설정
    mock_classify.return_value = "경찰청"
    
    # 테스트 입력 정의
    test_payload = {"text": "불법 주정차 신고합니다."}
    
    # 요청 전송
    response = client.post("/classify", json=test_payload)
    
    # 응답 검증
    assert response.status_code == 200
    data = response.json()
    assert data["agency"] == "경찰청"
    assert data["message"] == "Success"
    
    print("✅ /classify endpoint test passed!")

if __name__ == "__main__":
    try:
        test_classify_endpoint()
    except AssertionError as e:
        print(f"❌ Test failed: {e}")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
