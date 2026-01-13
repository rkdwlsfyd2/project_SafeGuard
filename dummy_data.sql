-- 1. 민원 더미데이터 80건 생성 및 기관 매핑
-- (complaint 테이블에 INSERT하고, 생성된 complaint_no를 받아와 complaint_agency에도 INSERT)

WITH inserted_complaints AS (
    INSERT INTO complaint (
        category, 
        title, 
        content, 
        status, 
        user_no, 
        agency_no, 
        created_date, 
        address, 
        latitude, 
        longitude, 
        is_public, 
        like_count
    )
    SELECT
        -- 카테고리: 도로, 환경, 교통, 안전, 생활 중 랜덤
        (ARRAY['도로', '환경', '교통', '안전', '생활'])[floor(random() * 5 + 1)],
        
        -- 제목
        '민원 접수 테스트 - ' || i,
        
        -- 내용
        '이것은 테스트를 위해 생성된 자동 더미 민원입니다. 번호: ' || i,
        
        -- 상태: UNPROCESSED(미처리), IN_PROGRESS(처리중), COMPLETED(완료) 랜덤
        -- (App Enum과 일치시키기 위해 RECEIVED 대신 UNPROCESSED 사용)
        (ARRAY['UNPROCESSED', 'IN_PROGRESS', 'COMPLETED'])[floor(random() * 3 + 1)],
        
        -- 작성자: user_no 1번 (존재한다고 가정)
        (SELECT COALESCE(MIN(user_no), 1) FROM app_user),
        
        -- 담당기관: 1~38 사이 랜덤 (agency 테이블 ID 범위 추정)
        (floor(random() * 38) + 1)::int,
        
        -- 등록일: 최근 30일 이내 랜덤
        NOW() - (random() * interval '30 days'),
        
        -- 주소
        '서울특별시 테헤란로 ' || i,
        
        -- 좌표 (서울 근방)
        37.5 + (random() * 0.1),
        127.0 + (random() * 0.1),
        
        -- 공개 여부
        true,
        
        -- 좋아요 수
        floor(random() * 50)::int
        
    FROM generate_series(1, 80) AS i
    RETURNING complaint_no, agency_no
)
INSERT INTO complaint_agency (complaint_no, agency_no)
SELECT complaint_no, agency_no FROM inserted_complaints;


-- 2. 검증용 SQL
-- 생성된 민원 개수 (80건 이상이어야 함)
SELECT COUNT(*) as total_complaints FROM complaint;

-- 기관별 민원 분포 확인
SELECT a.agency_name, COUNT(c.complaint_no) as count
FROM complaint c
LEFT JOIN agency a ON c.agency_no = a.agency_no
GROUP BY a.agency_name
ORDER BY count DESC;
