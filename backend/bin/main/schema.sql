-- 모든 테이블 삭제 (순서 주의)
DROP TABLE IF EXISTS spatial_feature CASCADE;
DROP TABLE IF EXISTS complaint_agency CASCADE;
DROP TABLE IF EXISTS complaint_file CASCADE;
DROP TABLE IF EXISTS complaint_reply CASCADE;
DROP TABLE IF EXISTS complaint_history CASCADE;
DROP TABLE IF EXISTS post_like CASCADE;
DROP TABLE IF EXISTS complaint CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS agency CASCADE;

-- ENUM 타입 삭제 및 생성
DO $$ BEGIN
    DROP TYPE IF EXISTS agency_task_status CASCADE;
    DROP TYPE IF EXISTS complaint_status CASCADE;
    DROP TYPE IF EXISTS user_role CASCADE;
EXCEPTION WHEN OTHERS THEN END $$;

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'AGENCY');
CREATE TYPE complaint_status AS ENUM ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE agency_task_status AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- 1. agency
CREATE TABLE agency (
    agency_no BIGSERIAL PRIMARY KEY,
    agency_type VARCHAR(20) NOT NULL,
    agency_name VARCHAR(200) NOT NULL,
    region_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. app_user
CREATE TABLE app_user (
    user_no BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    pw VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    addr VARCHAR(300) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    role user_role NOT NULL DEFAULT 'USER',
    agency_no BIGINT REFERENCES agency(agency_no)
);

-- 3. complaint
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
    status complaint_status NOT NULL DEFAULT 'RECEIVED',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    user_no BIGINT NOT NULL REFERENCES app_user(user_no)
);

-- 4. 기타 보조 테이블
CREATE TABLE spatial_feature (
    feature_id BIGSERIAL PRIMARY KEY,
    feature_type VARCHAR(20) NOT NULL,
    geom_text TEXT,
    complaint_no BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE
);
