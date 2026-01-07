# 프로젝트 실행 및 배포 가이드

이 문서는 SafeGuard 프로젝트를 **로컬에서 개발**하는 방법과 **서버에 배포**하는 방법을 안내합니다.

## 1. 로컬 개발 환경 (Local Development)

개발 속도를 높이고 디버깅을 쉽게 하기 위해 백엔드와 프론트엔드를 각각 실행하는 방법을 권장합니다.

### 필수 준비물
- Java 17 (JDK)
- Node.js 18+
- Docker & Docker Compose (DB 및 AI 서비스 실행용)

### 1단계: 인프라 실행 (DB, AI 서비스)
백엔드가 의존하는 데이터베이스와 AI 서비스를 먼저 Docker로 실행합니다.
```bash
# 프로젝트 루트 폴더에서
docker-compose up -d db ai-yolo ai-stt
```
> **⚠️ 중요: 도커 컨테이너 상태 관리**
> - **개발할 때**: `safeguard-backend`와 `safeguard-frontend` 컨테이너는 **꺼져 있어야(Grey/Stop)** 합니다. 켜져 있으면 포트(8080, 80)가 충돌나서 우리가 실행하는 코드가 에러납니다.
> - **배포/테스트할 때**: 모든 컨테이너를 **켜야(Blue/Start)** 합니다.

### 2단계: 백엔드 실행 (Spring Boot)
1. IntelliJ 등 IDE에서 프로젝트 열기 (`c:\project_SafeGuard\backend`).
2. `src/main/resources/application.properties` 확인 (DB 설정 등).
3. `SafeGuardApplication.java` 파일을 열고 **Run (▶)** 버튼 클릭.
   - 또는 터미널에서: `./gradlew bootRun` (Windows는 `gradlew.bat bootRun`)
4. 서버 시작 확인: "Tomcat started on port(s): 8080" 로그 확인.

### 3단계: 프론트엔드 실행 (React + Vite)
1. 터미널을 열고 프론트엔드 폴더로 이동:
   ```bash
   cd frontend
   ```
2. 패키지 설치 (최초 1회):
   ```bash
   npm install
   ```
3. 개발 서버 실행:
   ```bash
   npm run dev
   ```
4. 브라우저 접속: `http://localhost:5173`
   - 프록시 설정이 되어 있어 API 요청은 자동으로 로컬 백엔드(`localhost:8080`)로 전달됩니다.

> **💡 Windows PowerShell 오류 해결**
> 만약 `npm run dev` 실행 시 "스크립트를 실행할 수 없습니다"라는 빨간 에러가 뜬다면, 명령어 뒤에 `.cmd`를 붙여서 실행하세요:
> ```bash
> npm.cmd run dev
> ```

---

## 2. 전체 통합 테스트 (Full Docker Test)

배포 전에 실제 서버 환경과 똑같은 상태로 테스트하고 싶을 때 사용합니다.

```bash
# 모든 서비스를 도커로 한 번에 실행
docker-compose up --build
```
- 접속 주소: `http://localhost:80` (Nginx가 프론트/백엔드/AI 연결을 모두 처리함)
- **주의**: 이 모드에서는 코드를 수정해도 바로 반영되지 않으므로, 개발 중에는 위 1번 방법을 더 추천합니다.

---

## 3. 서버 배포 (Server Deployment)

이 프로젝트는 **GitHub Actions**를 통해 자동 배포되도록 구성되어 있습니다.

### 배포 방법
1. 코드를 작성하고 커밋(Commit)합니다.
2. `main` 브랜치로 푸시(Push)하거나 PR을 병합(Merge)합니다.
   ```bash
   git checkout main
   git pull
   git merge feature/my-new-feature
   git push origin main
   ```
3. **끝입니다!**
   - GitHub Actions가 자동으로 감지 -> Docker 이미지 빌드 -> AWS ECR 업로드 -> AWS ECS 배포 과정을 수행합니다.
   - 약 5~10분 후 서버(`safe-guard.website`)에 반영됩니다.

---

## 4. AI 서비스 테스트 방법 (AI Verification)

AI 서비스(Yolo, STT, RAG)가 잘 동작하는지 확인하려면 다음 주소로 접속해 보세요. 
(Docker가 켜져 있어야 합니다)

### 1) YOLO (이미지 분석)
- **주소**: `http://localhost:5001/docs` (Swagger UI)
- **테스트**: `/analyze-image` 탭 열기 -> `Try it out` -> 이미지 파일 업로드 -> `Execute`
- **성공 시**: JSON 결과가 나오면 정상입니다.

### 2) STT & RAG (음성 인식 및 질의응답)
- **주소**: `http://localhost:8000/docs` (Swagger UI)
- **설명**: RAG 기능이 STT 서비스에 포함되어 있습니다.
- **테스트**: `/transcribe` (STT), `/ask` (RAG) 등 관련 API를 이곳에서 테스트하세요.
- **참고**: STT/RAG 관련 코드는 팀원이 추후 별도 폴더에 추가할 예정입니다.

### 3) 수동 배포 (자동화 미설정 시)
만약 CI/CD가 아직 설정되지 않았다면, 서버에 접속해서 다음 명령어를 입력합니다.
```bash
ssh -i key.pem user@your-server-ip
cd project_SafeGuard
git pull
docker-compose up --build -d
```
