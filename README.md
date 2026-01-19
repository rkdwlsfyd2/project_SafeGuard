# Overdue Complaint Data (Test Data)

Here are 10 manual INSERT statements to generate overdue complaints for testing the dashboard.
These complaints are set to 'UNPROCESSED' or 'IN_PROGRESS' and date back 7-10 days, ensuring they appear as "Overdue" (SLA breached).
They are all mapped to **Agency 1 (Seoul)**.

```sql
-- 1. Gangnam-gu: Illegal Parking (7 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('강남구 불법 주정차 신고합니다', '차량이 인도에 주차되어 있어 통행이 불편합니다.', '불법주정차', '서울특별시 강남구 테헤란로 123', 'UNPROCESSED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 204)
RETURNING complaint_no;
-- (Assuming complaint_no is N, insert into agency mapping)
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 2. Seocho-gu: Illegal Dumping (8 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('서초구 쓰레기 무단 투기', '골목길에 쓰레기가 쌓여 악취가 납니다.', '청소', '서울특별시 서초구 서초대로 456', 'UNPROCESSED', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 3. Nowon-gu: Road Damage (9 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('노원구 도로 파손 위험', '도로에 싱크홀이 생길 것 같습니다. 위험해보입니다.', '안전', '서울특별시 노원구 동일로 789', 'IN_PROGRESS', NOW() - INTERVAL '9 days', NOW() - INTERVAL '1 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 4. Mapo-gu: Noise Complaint (10 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('마포구 공사장 소음 심각', '새벽부터 공사 소음 때문에 잠을 못 자겠습니다.', '환경', '서울특별시 마포구 양화로 100', 'UNPROCESSED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 5. Songpa-gu: Broken Streetlight (7 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('송파구 가로등 고장', '밤에 너무 어두워서 무섭습니다. 수리 부탁드립니다.', '가로정비', '서울특별시 송파구 올림픽로 300', 'UNPROCESSED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 6. Gangdong-gu: Illegal Parking (8 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('강동구 소방차 전용구역 주차', '소방차 전용 구역에 주차된 차량이 있습니다. 강력 단속 바랍니다.', '불법주정차', '서울특별시 강동구 천호대로 500', 'IN_PROGRESS', NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 7. Yongsan-gu: Road Maintenance (9 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('용산구 보도블럭 파손', '보도블럭이 튀어나와서 넘어질 뻔 했습니다.', '안전', '서울특별시 용산구 한강대로 200', 'UNPROCESSED', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 8. Gwanak-gu: Waste Dumping (10 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('관악구 주택가 쓰레기', '분리수거가 안 된 쓰레기가 방치되어 있습니다.', '청소', '서울특별시 관악구 남부순환로 150', 'IN_PROGRESS', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 9. Seongdong-gu: Noise (7 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('성동구 층간소음 민원', '윗집 소음이 너무 심합니다. 중재 부탁드립니다.', '환경', '서울특별시 성동구 왕십리로 50', 'UNPROCESSED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);

-- 10. Jongno-gu: Illegal Banner (8 days ago)
INSERT INTO complaint (title, content, category, address, status, created_date, updated_date, user_no)
VALUES ('종로구 불법 현수막 철거 요청', '가로수를 훼손하는 불법 현수막 철거해주세요.', '가로정비', '서울특별시 종로구 종로 1', 'UNPROCESSED', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', 204)
RETURNING complaint_no;
INSERT INTO complaint_agency (complaint_no, agency_no)
VALUES ((SELECT currval('complaint_complaint_no_seq')), 1);
```
