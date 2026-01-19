-- ==========================================
-- SafeGuard Database Initialization Script
-- ==========================================

-- 1. 기존 테이블 삭제 (순서 중요: FK 의존성 역순)
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS spatial_feature CASCADE;
DROP TABLE IF EXISTS complaint_like CASCADE;
DROP TABLE IF EXISTS post_like CASCADE;
DROP TABLE IF EXISTS complaint_agency CASCADE;
DROP TABLE IF EXISTS complaint CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS agency CASCADE;

-- 2. 테이블 재생성

-- Agency (기관)
CREATE TABLE agency (
    agency_no BIGSERIAL PRIMARY KEY,
    agency_type VARCHAR(20) NOT NULL,
    agency_name VARCHAR(200) NOT NULL,
    region_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AppUser (유저)
CREATE TABLE app_user (
    user_no BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    pw VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    birth_date DATE,
    addr VARCHAR(300),
    phone VARCHAR(20),
    created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    agency_no BIGINT REFERENCES agency(agency_no)
);

-- Complaint (민원)
CREATE TABLE complaint (
    complaint_no BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    address VARCHAR(300),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    image_path VARCHAR(500),
    analysis_result JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPROCESSED',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    user_no BIGINT NOT NULL REFERENCES app_user(user_no) ON DELETE CASCADE,
    like_count INTEGER DEFAULT 0,
    answer TEXT
);

-- Complaint Like (좋아요 / 싫어요)
CREATE TABLE complaint_like (
    like_id BIGSERIAL PRIMARY KEY,
    complaint_no BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE,
    user_no BIGINT NOT NULL REFERENCES app_user(user_no) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(10) NOT NULL DEFAULT 'LIKE',
    UNIQUE(complaint_no, user_no)
);

-- Complaint Agency (민원-기관 연결)
CREATE TABLE complaint_agency (
    complaint_no BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE,
    agency_no BIGINT NOT NULL REFERENCES agency(agency_no) ON DELETE CASCADE,
    PRIMARY KEY (complaint_no, agency_no)
);

-- PostGIS Extension (필요 시 생성)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Spatial Feature (공간 정보)
CREATE TABLE spatial_feature (
    feature_id BIGSERIAL PRIMARY KEY,
    feature_type VARCHAR(20),
    geom GEOMETRY(Geometry, 4326),
    addr_text VARCHAR(300),
    complaint_no BIGINT REFERENCES complaint(complaint_no) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Error Logs (에러 로그)
CREATE TABLE error_logs (
    log_id BIGSERIAL PRIMARY KEY,
    trace_id VARCHAR(100),
    endpoint VARCHAR(200),
    http_method VARCHAR(10),
    client_ip VARCHAR(50),
    user_id VARCHAR(50),
    error_code VARCHAR(50),
    error_message TEXT,
    stack_trace TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. 기초 데이터 삽입 (Agencies)
INSERT INTO agency (agency_type, agency_name, region_code) VALUES
  ('LOCAL', '서울특별시', '11'),
  ('LOCAL', '부산광역시', '26'),
  ('LOCAL', '대구광역시', '27'),
  ('LOCAL', '인천광역시', '28'),
  ('LOCAL', '광주광역시', '29'),
  ('LOCAL', '대전광역시', '30'),
  ('LOCAL', '울산광역시', '31'),
  ('LOCAL', '세종특별자치시', '50'),
  ('LOCAL', '경기도', '41'),
  ('LOCAL', '강원특별자치도', '42'),
  ('LOCAL', '충청북도', '43'),
  ('LOCAL', '충청남도', '44'),
  ('LOCAL', '전북특별자치도', '45'),
  ('LOCAL', '전라남도', '46'),
  ('LOCAL', '경상북도', '47'),
  ('LOCAL', '경상남도', '48'),
  ('LOCAL', '제주특별자치도', '49');

INSERT INTO agency (agency_type, agency_name, region_code) VALUES
  ('CENTRAL', '경찰청', NULL),
  ('CENTRAL', '국토교통부', NULL),
  ('CENTRAL', '고용노동부', NULL),
  ('CENTRAL', '국방부', NULL),
  ('CENTRAL', '국민권익위원회', NULL),
  ('CENTRAL', '식품의약품안전처', NULL),
  ('CENTRAL', '대검찰청', NULL),
  ('CENTRAL', '기획재정부', NULL),
  ('CENTRAL', '행정안전부', NULL),
  ('CENTRAL', '보건복지부', NULL),
  ('CENTRAL', '과학기술정보통신부', NULL),
  ('CENTRAL', '국세청', NULL),
  ('CENTRAL', '기후에너지환경부', NULL),
  ('CENTRAL', '법무부', NULL),
  ('CENTRAL', '공정거래위원회', NULL),
  ('CENTRAL', '교육부', NULL),
  ('CENTRAL', '해양수산부', NULL),
  ('CENTRAL', '농림축산식품부', NULL),
  ('CENTRAL', '소방청', NULL),
  ('CENTRAL', '인사혁신처', NULL),
  ('CENTRAL', '기타', NULL);


-- ============================================================
-- 4. Dummy Data Generation (Users & Complaints)
-- ============================================================

DO $$
DECLARE
    -- User Arrays
    last_names text[] := ARRAY['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
    first_names text[] := ARRAY['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서', '서윤', '서연', '지우', '하윤', '민서', '하은', '지유', '윤서', '지아', '나은'];
    addresses text[] := ARRAY['서울특별시 강남구', '서울특별시 서초구', '서울특별시 송파구', '서울특별시 강서구', '서울특별시 마포구', '서울특별시 영등포구', '서울특별시 성동구', '서울특별시 종로구', '경기도 수원시', '경기도 성남시', '인천광역시 중구', '부산광역시 해운대구', '대구광역시 수성구', '대전광역시 유성구', '광주광역시 북구'];
    
    -- Complaint Constants
    categories text[] := ARRAY['교통', '도로', '환경', '보건', '안전', '행정', '기타'];
    statuses text[] := ARRAY['UNPROCESSED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
    
    -- Loop Variables
    i INT;
    v_complaint_id BIGINT;
    v_user_id BIGINT;
    v_lat DOUBLE PRECISION;
    v_lng DOUBLE PRECISION;
    v_category TEXT;
    v_status TEXT;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- 1) 사용자 생성 (2000명)
    INSERT INTO app_user (user_id, pw, name, birth_date, addr, phone, role)
    SELECT 
        'user' || i AS user_id,
        '$2b$10$Ooc3cQIUzbXrux1X6AoN7e7g1Uf7TdGxPEo/SNPkTuo5IgPhoyh3u' AS pw, -- test1234
        last_names[floor(random() * 20 + 1)] || first_names[floor(random() * 20 + 1)] AS name,
        (CURRENT_DATE - (interval '15 years' + random() * interval '50 years'))::date AS birth_date,
        addresses[floor(random() * 15 + 1)] || ' ' || floor(random() * 1000 + 1) || '번지' AS addr,
        '010-' || LPAD(floor(random() * 10000)::text, 4, '0') || '-' || LPAD(floor(random() * 10000)::text, 4, '0') AS phone,
        'USER' AS role
    FROM generate_series(1, 2000) AS i
    ON CONFLICT (user_id) DO NOTHING;

    -- 2) 민원 데이터 생성 (3000건)
    --    한국 좌표 범위: 위도 33~38, 경도 126~130 (대략적)
    --    서울 중심: 37.5, 126.97
    FOR i IN 1..3000 LOOP
        -- 랜덤 유저 선택
        v_user_id := floor(random() * 2000 + 1);
        
        -- 랜덤 좌표 (서울 근방 집중 + 전국 분포)
        IF random() < 0.7 THEN
             -- 서울/수도권 집중 (37.4 ~ 37.7, 126.8 ~ 127.2)
             v_lat := 37.4 + random() * 0.3;
             v_lng := 126.8 + random() * 0.4;
        ELSE
             -- 전국 분포 (34.0 ~ 38.0, 126.0 ~ 129.5)
             v_lat := 34.0 + random() * 4.0;
             v_lng := 126.0 + random() * 3.5;
        END IF;

        v_category := categories[floor(random() * 7 + 1)];
        v_status := statuses[floor(random() * 4 + 1)];
        -- 최근 3년 내 랜덤 날짜 (사용자 요청 반영)
        v_created_at := CURRENT_TIMESTAMP - (random() * interval '3 years');

        INSERT INTO complaint (
            category, title, content, address, latitude, longitude, 
            status, created_date, user_no
        ) VALUES (
            v_category,
            '민원 테스트 제목 ' || i,
            '민원 테스트 내용입니다. 불편합니다. 조치 부탁드립니다.',
            '대한민국 어느 곳',
            v_lat,
            v_lng,
            v_status,
            v_created_at,
            v_user_id
        ) RETURNING complaint_no INTO v_complaint_id;

        -- Agency 매핑 (랜덤하게 1개 기관 연결)
        -- Agency IDs start from a serial, assuming we have inserted about 38 agencies above.
        -- We'll pick a random ID between 1 and 38 (approx).
        -- To be safe, we can use a subquery or fixed range if we know serial reset (it is reset by drop table).
        INSERT INTO complaint_agency (complaint_no, agency_no)
        VALUES (
            v_complaint_id,
            (SELECT agency_no FROM agency ORDER BY random() LIMIT 1)
        );

        -- COMPLETED 상태인 경우 completed_date 업데이트
        IF v_status = 'COMPLETED' THEN
            UPDATE complaint 
            SET completed_date = v_created_at + (random() * interval '5 days')
            WHERE complaint_no = v_complaint_id;
        END IF;

    END LOOP;

END $$;

-- 결과 확인
SELECT 'Users Created' as item, count(*) as count FROM app_user
UNION ALL
SELECT 'Complaints Created', count(*) FROM complaint;
