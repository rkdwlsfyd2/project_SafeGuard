# 📌 Pull Request

> **feat(dashboard): 대시보드 30초 자동 갱신 및 차트/KPI 전면 개편**

---

## 🏷 PR 태그
<!-- 해당되는 태그 전부 선택 -->
- [x] feat (기능 추가)
- [x] fix (버그 수정)
- [x] refactor (리팩토링)
- [ ] chore (환경/설정/정리)
- [ ] docs (문서)
- [ ] test (테스트)
- [ ] infra (배포/인프라)
- [ ] hotfix (긴급 수정)

---

## 1️⃣ 개요 (Overview)
- **작업 목적**: 관리자 대시보드의 실시간성 강화를 위한 자동 갱신 기능 도입 및 직관적인 데이터 시각화를 위한 KPI/차트 UI 개선
- **배경 / 문제 인식**:
  - 기존 대시보드는 정적 데이터만 표시하여 실시간 민원 증감을 파악하기 어려웠음.
  - "미처리 건수" KPI의 시인성이 낮고, 시간 기준(일/월/년)에 따른 비교 데이터(증감율)가 명확하지 않았음.
  - 차트 레이아웃이 비효율적이어 공간 낭비가 있었음.
- **관련 이슈**: N/A

---

## 2️⃣ 문제 정의 (Problem)

### 발생 조건
- 대시보드를 장시간 켜놓고 모니터링하는 관제 환경.
- 다양한 시간 기준('일별', '월별', '년별')으로 데이터를 분석하고자 할 때.

### 문제 현상
- 사용자가 직접 새로고침하지 않으면 최신 데이터가 반영되지 않음.
- KPI 카드의 색상이 동적으로 변해(Signal Color) 오히려 데이터의 의미(긍정/부정)를 혼동시킴.
- 분류별 통계 리스트가 너무 길어지거나 잘려서 보임.

### 잠재적 위험
- [ ] 성능
- [x] 안정성 (기존 없음)
- [ ] 데이터 무결성
- [ ] 보안

---

## 3️⃣ 해결 전략 (Solution)

### 접근 방식
- **실시간성 확보**: `setInterval`을 이용한 30초 주기 자동 데이터 페칭(Polling) 구현 및 가시적인 카운트다운 타이머 제공.
- **데이터 직관성 강화**:
  - `ComplaintGrowthTrendChart` 신규 구현: 막대(접수) + 꺾은선(증감율) 복합 차트와 상단 요약 바(Summary Bar) 결합.
  - `Summary Bar`: 오늘/이번달/올해의 접수 건수와 전일/전월/전년 대비 증감율을 한눈에 표시.
  - KPI 카드 색상 고정 및 비교 텍스트 동적화.
- **구조적 리팩토링**: `refreshKey` Prop을 도입하여 부모(`Dashboard`)의 타이머 트리거를 자식 차트 컴포넌트들에 전파, 일괄 갱신 유도.

### 적용 기술 / 로직
1.  **React Hooks (`useEffect`, `useState`)**: 30초 타이머 및 `refreshKey` 상태 관리.
2.  **DTO & MyBatis Mapper 확장**:
    - `ComplaintStatsDTO`: `todayCount`, `yesterdayCount`, `monthCount`, `lastMonthCount`, `yearCount`, `lastYearCount` 필드 추가.
    - `ComplaintMapper`: 단일 쿼리 내에서 `CASE WHEN` 구문을 사용하여 기간별 집계 동시 수행.
3.  **Flexbox & Grid Layout**: 반응형 차트 배치 및 리스트 스크롤 처리.

### 대안 검토
- **WebSocket**: 실시간성이 더 뛰어나나, 현재 트래픽 규모와 구현 복잡도를 고려할 때 30초 Polling으로도 충분하다고 판단.

---

## 4️⃣ 수정 내용 / 작업 내용 (What & How)

### 주요 변경 사항
- **Frontend**:
  - `Dashboard.tsx`: 30초 카운트다운 타이머 UI 추가, `refreshKey` 로직 구현, 차트 배치 변경.
  - `ComplaintGrowthTrendChart.tsx`: 신규 차트 컴포넌트 생성 (접수량 + 증감율 + 요약 바).
  - `ComplaintTrendChart.tsx`: "미처리 건수" KPI 카드 디자인 개선 (고정 색상, 동적 비교 텍스트).
  - `ComplaintCategoryChart.tsx`: "전체 보기" 버튼 추가, 리스트 높이 고정 및 스크롤 적용.
- **Backend**:
  - `ComplaintStatsDTO.java`: 요약 통계 필드 추가.
  - `ComplaintMapper.xml`: `selectComplaintStats` 쿼리에 기간별 집계 로직 추가.

### 변경 흐름
```text
[Before]
사용자 수동 새로고침 -> API 요청 -> 데이터 갱신
KPI 카드: 조건에 따라 배경색 변경 (혼란 유발)

[After]
30초 타이머 작동 -> (0초 도달) -> 자동 API 요청 -> 모든 차트 데이터 갱신
KPI 카드: 고정 색상(Blue), 텍스트(증감율)로 상태 표현
```

---

## 5️⃣ 시스템 아키텍처 관점

### 변경 레이어
- [x] Client / Frontend
- [x] API / Backend
- [ ] AI / ML
- [x] DB (Query Customization)
- [ ] Infra

### 컴포넌트 역할 변화
- **변경 전**: `Dashboard`는 단순히 뷰 역할.
- **변경 후**: `Dashboard`가 데이터 갱신 주기(Refresh Cycle)를 관리하는 컨트롤러 역할 수행.

### 타 서비스 영향
- 없음. 대시보드 조회 API만 수정됨.

---

## 6️⃣ 수정한 파일 목록 (File Changes)

| 구분 | 파일 경로 | 변경 유형 | 설명 |
|----|---------|---------|----|
| FE | `src/pages/Dashboard.tsx` | refactor | 자동 갱신 로직, 타이머 UI, 차트 prop 연결 |
| FE | `src/components/Charts/ComplaintGrowthTrendChart.tsx` | feat | 신규 차트 및 Summary Bar 구현 |
| FE | `src/components/Charts/ComplaintTrendChart.tsx` | fix | KPI 카드 색상 고정 및 Backlog 로직 개선 |
| FE | `src/components/Charts/ComplaintCategoryChart.tsx` | style | 리스트 높이 조정 및 전체보기 버튼 추가 |
| BE | `src/main/resources/mapper/ComplaintMapper.xml` | refactor | 기간별 통계 집계 쿼리 추가 |
| BE | `src/main/java/com/safeguard/dto/ComplaintStatsDTO.java` | refactor | DTO 필드 확장 |

- **변경 규모**
  - [ ] 소규모
  - [ ] 중간
  - [x] 대규모

---

## 7️⃣ 테스트 (Test)

### 테스트 환경
- [x] Local
- [ ] Docker
- [ ] Dev
- [ ] Staging
- [ ] Production

### 테스트 시나리오
1.  대시보드 진입 후 타이머가 30초에서 카운트다운 되는지 확인.
2.  0초가 되면 `refreshKey`가 업데이트되고 네트워크 탭에서 API 재요청이 발생하는지 확인.
3.  `ComplaintGrowthTrendChart` 상단 요약 바에 오늘/이번달/올해 데이터가 정상 출력되는지 확인.
4.  시간 기준(일/월/년) 변경 시 KPI 카드의 "전일/전월/전년 대비" 텍스트가 올바르게 변경되는지 확인.

### 테스트 결과
- **기대 결과**: 모든 차트가 에러 없이 렌더링되고, 30초마다 데이터가 자동 갱신됨.
- **실제 결과**: 정상 동작 확인 완료.

---

## 8️⃣ 결과 (Result)
- **동작 결과**: 관리자가 별도 조작 없이도 실시간에 가까운 민원 현황을 파악 가능.
- **개선 효과**: 데이터 시각화의 정확도 및 편의성 증대, 관제 업무 효율성 향상.
- **부작용 여부**:
  - [x] 없음
  - [ ] 있음 (기재)

---

## 9️⃣ Breaking Change 여부
- [x] 있음
- [ ] 없음

> 있음일 경우 반드시 기재  
> - 변경 내용: `ComplaintStatsDTO` 구조 변경으로 인해 API 응답 포맷의 `summary` 객체 내 필드가 확장됨.
> - 대응 방법: 프론트엔드에서 해당 필드를 사용하도록 수정 완료하였으므로 추가 조치 불필요.

---

## 🔟 배포 / 운영 영향

- **재배포 필요 여부**
  - [x] 필요 (Frontend, Backend 모두 포함)
  - [ ] 불필요

- **설정 / 환경 변수 변경**
  - [ ] 있음
  - [x] 없음

- **데이터 마이그레이션**
  - [ ] 있음
  - [x] 없음

---

## 🔍 리뷰어 참고 사항

- **중점 리뷰 요청 사항**: `ComplaintMapper.xml`의 SQL 복잡도 증가에 따른 쿼리 성능 영향 검토 부탁드립니다.
- **설계 상 고민 / 트레이드오프**: 30초 주기는 서버 부하와 실시간성의 절충안입니다. 추후 부하 발생 시 주기를 늘리거나 WebSocket으로 전환 고려 가능합니다.

---

## ✅ 체크리스트
- [x] PR 태그 선택 완료
- [x] 이슈 연결 완료
- [x] 테스트 완료
- [x] 로그/에러 확인
- [x] 불필요한 코드 제거
- [x] 배포 영향 검토
- [x] 아키텍처 변경 여부 검토

---

## 🧩 (선택) 태그별 상세 섹션

<details>
<summary>🟢 feat — 기능 개발</summary>

- **자동 갱신**: `setInterval`을 사용해 30초마다 `refreshKey`를 업데이트하고, 이를 차트 컴포넌트의 의존성 배열(`useEffect deps`)에 포함시켜 데이터 재조회를 트리거함.
- **Summary Bar**: 단일 쿼리로 오늘(Today), 이번달(Month), 올해(Year)의 데이터를 한 번에 조회하여 DB 접근 횟수를 최소화함.

</details>

<details>
<summary>🔴 fix — 버그 수정</summary>

- **KPI Color**: 조건부 색상 변경 로직이 사용자에게 혼란을 주어, 파란색(Blue) 계열로 통일하고 증감율 텍스트 색상만 변하도록 수정.
- **List Scroll**: 데이터가 많을 때 화면이 길어지는 문제를 해결하기 위해 고정 높이(`680px`)와 `overflow-y: auto` 적용.

</details>
