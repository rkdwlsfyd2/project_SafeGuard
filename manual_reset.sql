-- ⚠️ DBeaver에서 이 스크립트를 실행하면 데이터가 초기화됩니다.
-- (전체 선택 후 ALT+X 또는 Execute Script 버튼 실행)

-- 1. 기존 테이블 삭제 (순서 중요)
DROP TABLE IF EXISTS complaint_like CASCADE;
DROP TABLE IF EXISTS post_like CASCADE;
DROP TABLE IF EXISTS complaint_agency CASCADE;
DROP TABLE IF EXISTS complaint_file CASCADE;
DROP TABLE IF EXISTS complaint_history CASCADE;
DROP TABLE IF EXISTS complaint_reply CASCADE;
DROP TABLE IF EXISTS complaint CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS agency CASCADE;
DROP TABLE IF EXISTS spatial_feature CASCADE;

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
    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    user_no BIGINT NOT NULL REFERENCES app_user(user_no),
    agency_no BIGINT REFERENCES agency(agency_no),
    like_count INTEGER DEFAULT 0,
    answer TEXT
);

-- Complaint Like (좋아요)
CREATE TABLE complaint_like (
    like_id BIGSERIAL PRIMARY KEY,
    complaint_no BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE,
    user_no BIGINT NOT NULL REFERENCES app_user(user_no) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(complaint_no, user_no)
);

-- Complaint Agency (민원-기관 연결)
CREATE TABLE complaint_agency (
    complaint_no BIGINT NOT NULL,
    agency_no BIGINT NOT NULL,
    PRIMARY KEY (complaint_no, agency_no)
);

-- 호환성을 위해 post_like 뷰 또는 테이블 생성 (기존 코드 호환)
CREATE TABLE post_like (
    post_like_no BIGSERIAL PRIMARY KEY,
    complaint_no BIGINT NOT NULL,
    user_no BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
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
  ('CENTRAL', '행정안전부', NULL),
  ('CENTRAL', '보건복지부', NULL),
  ('CENTRAL', '교육부', NULL),
  ('CENTRAL', '환경부', NULL);


-- 4. 테스트 유저 삽입 (비밀번호: testuser123의 해시값이라고 가정하거나, 백엔드에서 생성 권장)
-- 여기서는 임시로 plaintext password를 비워둡니다. 실제 로그인을 위해서는 백엔드 회원가입을 이용하거나 Seed API를 써야 합니다.
INSERT INTO app_user (user_id, pw, name, role) VALUES 
('testuser', '$2a$10$SomethingHashed...', '테스트유저', 'USER');

-- 끝
SELECT 'Reset Complete' as status;
