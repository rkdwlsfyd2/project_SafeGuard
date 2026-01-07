from classification_service import classify_complaint
import sys

def run_cli():
    """
    래그 정확도 테스트용 코드입니다. >>>>>>>>>>>> 목표로 정한 정확도 확보시 삭제하세요.
    약 0.8~0.9 이상 목표예정 

    사용자가 터미널에서 직접 민원 내용을 입력하고
    실시간으로 분석 결과를 확인할 수 있는 CLI 도구입니다.
    """
    print("=" * 60)
    print("민원 분석 AI 테스트 콘솔 (RAG 기반)")
    print("입력창에 민원 내용을 입력하면 담당 기관과 근거 법령을 분석합니다.")
    print("'q' 또는 'exit'를 입력하면 종료합니다.")
    print("=" * 60)

    while True:
        try:
            # Python 3 호환 입력 처리
            user_input = input("\n 민원 내용 입력: ").strip()
            
            if user_input.lower() in ['q', 'exit', 'quit']:
                print(" 프로그램을 종료합니다.")
                break
            
            if not user_input:
                continue

            print("\n 분석 중...", end="", flush=True)
            
            # 분류 함수 실행 (classification_service.py 활용)
            result_data = classify_complaint(user_input)
            result = result_data.get("agency", "알 수 없음")
            
            # 결과는 이미 classify_complaint 내부에서 print되지만,
            # 반환값(기관명)도 명확히 한 번 더 표시
            print(f"\n 최종 판단 기관: {result}")
            print("-" * 60)
            
        except KeyboardInterrupt:
            print("\n 프로그램을 종료합니다.")
            break
        except Exception as e:
            print(f"\n 오류 발생: {e}")

if __name__ == "__main__":
    run_cli()
