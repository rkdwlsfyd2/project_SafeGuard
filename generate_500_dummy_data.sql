-- 500개의 민원 더미데이터 생성 및 기관 매핑
-- 이 스크립트는 PostgreSQL의 generate_series를 사용하여 500개의 데이터를 효율적으로 생성합니다.

WITH user_info AS (
    -- 기본 사용자(testuser) 정보를 가져옵니다. 없을 경우 1번 사용자를 기본값으로 합니다.
    SELECT COALESCE(MIN(user_no), 1) as user_no FROM app_user WHERE user_id = 'testuser'
),
agency_info AS (
    -- 기관 정보 목록을 가져옵니다.
    SELECT agency_no FROM agency
),
data_source AS (
    SELECT
        i,
        -- 카테고리 랜덤 설정
        (ARRAY['도로', '환경', '교통', '안전', '생활', '시설'])[floor(random() * 6 + 1)] as category,
        -- 제목 설정
        '대규모 더미 민원 - ' || LPAD(i::text, 3, '0') as title,
        -- 내용 설정
        '시스템 테스트를 위해 생성된 대규모 더미 데이터입니다. (데이터 번호: ' || i || '). 민원 내용에 대한 상세한 조사가 필요합니다.' as content,
        -- 상태 랜덤 설정
        (ARRAY['RECEIVED', 'IN_PROGRESS', 'COMPLETED'])[floor(random() * 3 + 1)] as status,
        -- 작성자 설정
        (SELECT user_no FROM user_info) as user_no,
        -- 최근 60일 이내 랜덤 날짜 설정
        NOW() - (random() * interval '60 days') as created_date,
        -- 주소 및 좌표 설정 (서울 및 주요 수도권 근방 랜덤)
        '서울특별시 및 경기도 일대 주소 ' || i as address,
        37.3 + (random() * 0.4) as latitude,
        126.8 + (random() * 0.4) as longitude,
        true as is_public,
        floor(random() * 100)::int as like_count
    FROM generate_series(1, 500) AS i
),
inserted_complaints AS (
    -- 민원 데이터 삽입
    INSERT INTO complaint (
        category, title, content, status, user_no, created_date, address, latitude, longitude, is_public, like_count
    )
    SELECT category, title, content, status, user_no, created_date, address, latitude, longitude, is_public, like_count
    FROM data_source
    RETURNING complaint_no, title
)
-- 민원-기관 연결 (랜덤하게 기관 하나씩 매핑)
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT 
    ic.complaint_no, 
    (SELECT agency_no FROM agency_info ORDER BY random() LIMIT 1)
FROM inserted_complaints ic;

-- 생성 결과 확인
SELECT 
    (SELECT COUNT(*) FROM complaint) as total_complaints,
    (SELECT COUNT(*) FROM complaint_agency) as total_mappings;
