-- 2,000개의 민원 더미데이터 생성 및 기관 매핑 (자치구 정보 포함)
-- 이 스크립트는 PostgreSQL의 generate_series를 사용하여 2,000개의 데이터를 효율적으로 생성합니다.

WITH user_list AS (
    -- 관리자나 기관 계정을 제외한 일반 사용자 목록
    SELECT user_no, ROW_NUMBER() OVER(ORDER BY user_no) as idx 
    FROM app_user 
    WHERE role = 'USER' AND user_id != 'admin'
),
user_count AS (
    SELECT COUNT(*)::int as total FROM user_list
),
agency_info AS (
    -- 기관 정보 목록을 가져옵니다.
    SELECT agency_no FROM agency
),
data_source AS (
    SELECT
        i,
        -- 요청하신 특정 비율에 따른 카테고리 할당 (총 2000건 기준)
        CASE 
            WHEN i <= 1460 THEN '교통' -- 73%
            WHEN i <= 1700 THEN '행정·안전' -- 12%
            WHEN i <= 1840 THEN '도로' -- 7%
            WHEN i <= 1920 THEN '산업·통상' -- 4%
            ELSE (ARRAY['환경','보건','안전','문화','교육','생활','시설','경찰·검찰','기타'])[((i-1921) % 9) + 1] -- 나머지 4% (약 80건 분산)
        END as category,
        -- 카테고리별 동적 제목 설정
        CASE 
            WHEN i <= 1460 THEN '교통'
            WHEN i <= 1700 THEN '행정·안전'
            WHEN i <= 1840 THEN '도로'
            WHEN i <= 1920 THEN '산업·통상'
            ELSE (ARRAY['환경','보건','안전','문화','교육','생활','시설','경찰·검찰','기타'])[((i-1921) % 9) + 1]
        END || ' 관련 시정 요청 - ' || LPAD(i::text, 4, '0') as title,
        -- 내용 설정
        '통계 검증을 위한 데이터입니다. 해당 건은 ' || 
        CASE 
            WHEN i <= 1460 THEN '교통'
            WHEN i <= 1700 THEN '행정·안전'
            WHEN i <= 1840 THEN '도로'
            WHEN i <= 1920 THEN '산업·통상'
            ELSE (ARRAY['환경','보건','안전','문화','교육','생활','시설','경찰·검찰','기타'])[((i-1921) % 9) + 1]
        END || ' 분야 민원으로 분류되었습니다. (시퀀스: ' || i || ')' as content,
        -- 작성자 랜덤 설정
        (SELECT user_no FROM user_list WHERE idx = (i % (SELECT total FROM user_count) + 1)) as user_no,
        -- 최근 3년(1095일) 이내 랜덤 날짜 설정
        NOW() - (random() * interval '1095 days') as created_date,
        -- 주소 설정: 서울 25개 자치구 랜덤 매핑
        '서울특별시 ' || (ARRAY[
            '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', 
            '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', 
            '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'
        ])[floor(random() * 25 + 1)] || ' ' || (floor(random()*500+1)) ||'번길 테스트 주소' as address,
        37.4 + (random() * 0.25) as latitude,
        126.8 + (random() * 0.35) as longitude,
        true as is_public,
        floor(random() * 150)::int as like_count
    FROM generate_series(1, 2000) AS i
),
data_with_status AS (
    SELECT
        *,
        -- 40일 이상 지난 데이터는 모두 COMPLETED로 설정 (현실적인 운영 이력 반영)
        CASE 
            WHEN created_date < NOW() - interval '40 days' THEN 'COMPLETED'
            ELSE (ARRAY['UNPROCESSED', 'IN_PROGRESS', 'COMPLETED'])[floor(random() * 3 + 1)]
        END as status
    FROM data_source
),
data_final AS (
    SELECT
        *,
        -- 상태에 따른 완료일 매핑 (평균 3일 지연)
        CASE 
            WHEN status = 'COMPLETED' THEN created_date + (random() * interval '6 days')
            ELSE NULL
        END as final_completed_date
    FROM data_with_status
),
inserted_complaints AS (
    -- 민원 데이터 삽입
    INSERT INTO complaint (
        category, title, content, status, user_no, created_date, completed_date, address, latitude, longitude, is_public, like_count, updated_date
    )
    SELECT 
        category, title, content, status, user_no, created_date, final_completed_date, address, latitude, longitude, is_public, like_count, 
        COALESCE(final_completed_date, created_date) as updated_date
    FROM data_final
    RETURNING complaint_no
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
    (SELECT COUNT(*) FROM complaint WHERE status = 'COMPLETED') as completed_complaints,
    (SELECT COUNT(*) FROM complaint WHERE status != 'COMPLETED') as active_complaints;
