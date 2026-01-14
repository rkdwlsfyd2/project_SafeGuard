-- 테스트 데이터 삽입 스크립트 (User No: 2)
-- 날짜는 최근 10일 간격으로 다양하게 생성
-- 상태: UNPROCESSED (미처리), IN_PROGRESS (처리중), COMPLETED (처리완료)

-- 1. Complaint 데이터 삽입
INSERT INTO complaint (category, title, content, user_no, status, created_date, address, like_count) VALUES
('교통', '불법주정차 신고합니다', '횡단보도 위에 주차되어 있습니다.', 2, 'UNPROCESSED', NOW(), '서울시 강남구 역삼동', 0),
('도로', '도로 파손 보수 요청', '도로에 큰 구멍이 생겨 위험합니다.', 2, 'IN_PROGRESS', NOW() - INTERVAL '1 DAY', '서울시 서초구 서초동', 2),
('환경', '쓰레기 무단투기 신고', '골목길에 쓰레기가 방치되어 있습니다.', 2, 'COMPLETED', NOW() - INTERVAL '2 DAY', '서울시 송파구 잠실동', 5),
('안전', '가로등 고장 신고', '가로등이 깜빡거려서 무섭습니다.', 2, 'UNPROCESSED', NOW() - INTERVAL '5 HOUR', '서울시 강북구 수유동', 1),
('교통', '신호등 고장', '신호등이 안 들어옵니다.', 2, 'IN_PROGRESS', NOW() - INTERVAL '3 DAY', '부산시 해운대구', 3),
('시설', '공원 벤치 파손', '공원 벤치가 부서져 있어요.', 2, 'COMPLETED', NOW() - INTERVAL '4 DAY', '대구시 중구', 0),
('환경', '소음 신고합니다', '공사 소음이 너무 심해요.', 2, 'UNPROCESSED', NOW(), '인천시 남동구', 0),
('교통', '버스정류장 파손', '유리가 깨져 있습니다.', 2, 'IN_PROGRESS', NOW() - INTERVAL '12 HOUR', '광주시 동구', 1),
('안전', '맨홀 뚜껑 열림', '위험해 보입니다.', 2, 'COMPLETED', NOW() - INTERVAL '5 DAY', '대전시 유성구', 10),
('기타', '불법 현수막 신고', '가로수에 불법 현수막이 있습니다.', 2, 'UNPROCESSED', NOW(), '울산시 남구', 0),
('교통', '장애인 주차구역 위반', '일반 차량이 주차했습니다.', 2, 'IN_PROGRESS', NOW() - INTERVAL '2 DAY', '세종시', 4),
('도로', '보도블록 교체 요청', '비가 오면 물이 고입니다.', 2, 'IN_PROGRESS', NOW() - INTERVAL '6 DAY', '경기도 수원시', 2),
('환경', '하천 악취 신고', '냄새가 너무 납니다.', 2, 'COMPLETED', NOW() - INTERVAL '7 DAY', '강원도 춘천시', 1),
('안전', '놀이터 기구 파손', '아이들이 다칠 것 같아요.', 2, 'UNPROCESSED', NOW() - INTERVAL '1 DAY', '충북 청주시', 0),
('교통', '교차로 꼬리물기 단속 요청', '출퇴근 시간에 너무 심합니다.', 2, 'IN_PROGRESS', NOW() - INTERVAL '3 DAY', '충남 천안시', 5),
('시설', '가로수 가지치기 요청', '간판을 가립니다.', 2, 'COMPLETED', NOW() - INTERVAL '8 DAY', '전북 전주시', 2),
('기타', '야생동물 출몰', '멧돼지가 나타났어요.', 2, 'UNPROCESSED', NOW(), '전남 목포시', 0),
('도로', '자전거 도로 파손', '자전거 타기가 위험합니다.', 2, 'IN_PROGRESS', NOW() - INTERVAL '4 DAY', '경북 포항시', 1),
('환경', '미세먼지 저감 대책 문의', '살수차 운행 부탁드립니다.', 2, 'COMPLETED', NOW() - INTERVAL '9 DAY', '경남 창원시', 3),
('안전', 'CCTV 설치 요청', '어두운 골목이라 불안합니다.', 2, 'IN_PROGRESS', NOW() - INTERVAL '2 DAY', '제주시', 8);

-- 2. Complaint-Agency 연결 (직관적으로 매핑, agency_no 1~17은 지자체라 가정)
-- Last ID 등을 모르므로 서브쿼리나 하드코딩 대신,
-- 방금 넣은 데이터가 complaint_no가 순차적으로 들어간다고 가정하고 (기존 데이터가 리셋되었다면 1부터, 아니면 max+1부터)
-- 여기서는 예시로 가장 최근 들어간 20개에 대해 매핑하는 로직이 안전하지만,
-- SQL 스크립트 특성상 그냥 INSERT SELECT로 매핑하거나,
-- 사용자가 DB를 리셋하고 넣는다면 1~20이라 가정.
-- 안전하게 title로 매칭하여 insert

INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 1 FROM complaint WHERE title = '불법주정차 신고합니다'; -- 서울
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 1 FROM complaint WHERE title = '도로 파손 보수 요청'; -- 서울
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 1 FROM complaint WHERE title = '쓰레기 무단투기 신고'; -- 서울
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 1 FROM complaint WHERE title = '가로등 고장 신고'; -- 서울
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 2 FROM complaint WHERE title = '신호등 고장'; -- 부산
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 3 FROM complaint WHERE title = '공원 벤치 파손'; -- 대구
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 4 FROM complaint WHERE title = '소음 신고합니다'; -- 인천
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 5 FROM complaint WHERE title = '버스정류장 파손'; -- 광주
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 6 FROM complaint WHERE title = '맨홀 뚜껑 열림'; -- 대전
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 7 FROM complaint WHERE title = '불법 현수막 신고'; -- 울산
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 8 FROM complaint WHERE title = '장애인 주차구역 위반'; -- 세종
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 9 FROM complaint WHERE title = '보도블록 교체 요청'; -- 경기
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 10 FROM complaint WHERE title = '하천 악취 신고'; -- 강원
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 11 FROM complaint WHERE title = '놀이터 기구 파손'; -- 충북
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 12 FROM complaint WHERE title = '교차로 꼬리물기 단속 요청'; -- 충남
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 13 FROM complaint WHERE title = '가로수 가지치기 요청'; -- 전북
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 14 FROM complaint WHERE title = '야생동물 출몰'; -- 전남
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 15 FROM complaint WHERE title = '자전거 도로 파손'; -- 경북
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 16 FROM complaint WHERE title = '미세먼지 저감 대책 문의'; -- 경남
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, 17 FROM complaint WHERE title = 'CCTV 설치 요청'; -- 제주
