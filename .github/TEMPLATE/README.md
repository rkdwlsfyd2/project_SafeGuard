# 📂 SafeGuard 프로젝트 템플릿 가이드

이 디렉토리(`/.github/TEMPLATE`)는 프로젝트의 표준화된 문서 양식을 관리하는 공간입니다.
각 템플릿의 목적과 사용 시점을 안내합니다.

---

## 📋 템플릿 목록 및 사용법

### 1. [ISSUE.md](./ISSUE.md)
- **용도**: 새로운 작업(버그, 기능, 개선 등)을 정의할 때 사용합니다.
- **사용 시점**: GitHub Issue 생성 시 본문에 복사하여 사용하거나, Issue Template으로 등록하여 사용.
- **핵심 내용**: 배경, 문제 정의, 목표, 해결 방향, 예상 리스크.

### 2. [Feature_Specification.md](./Feature_Specification.md)
- **용도**: 기능 구현 전, 상세 설계를 위한 기술 명세서입니다.
- **사용 시점**: Issue가 생성되고, 실제 구현에 들어가기 전 **Planning 단계**에서 작성.
- **핵심 내용**: 기술 스택, UI/UX 설계, 데이터 흐름, API 명세, 예외 처리.

### 3. [Milestone.md](./Milestone.md)
- **용도**: 2주~한 달 단위의 마일스톤(스프린트) 계획을 수립할 때 사용합니다.
- **사용 시점**: 프로젝트의 큰 단계(Phase)를 시작하기 전.
- **핵심 내용**: 목표, 범위(Scope), 주요 산출물, 일정 및 의존성, 완료 기준(DoD).

### 4. [PULL_REQUEST_TEMPLATE.md](./PULL_REQUEST_TEMPLATE.md)
- **용도**: 코드 변경 사항을 Merge 요청할 때 사용하는 PR 양식입니다.
- **사용 시점**: 기능 구현 완료 후 Pull Request 생성 시 (GitHub 설정에 의해 자동 적용).
- **핵심 내용**: 작업 개요, 변경된 점, 테스트 결과, 리뷰어 가이드.

### 5. [project-whitepaper.md](./project-whitepaper.md)
- **용도**: 프로젝트 전체 시스템을 설명하는 백서(Whitepaper) 양식입니다.
- **사용 시점**: 프로젝트 초기 아키텍처 정의 시 또는 메이저 업데이트 시.
- **핵심 내용**: 문제 정의, 솔루션, 시스템 아키텍처, 핵심 알고리즘, API 규격.

---

## 🔄 권장 문서 워크플로우

1. **Issue 생성** (`ISSUE.md`)
   - "어떤 문제가 있고, 왜 해결해야 하는가?" 정의

2. **Feature Specification 작성** (`Feature_Specification.md`)
   - "어떻게 구현할 것인가?" 상세 설계 (구현 전 필수)

3. **구현 및 PR** (`PULL_REQUEST_TEMPLATE.md`)
   - 코드 작성 후 리뷰 요청

4. **문서 업데이트** (`project-whitepaper.md`)
   - 시스템 변경 사항이 생기면 백서에 반영

5. **마일스톤 관리** (`Milestone.md`)
   - 위 과정들을 묶어서 일정과 목표 관리
