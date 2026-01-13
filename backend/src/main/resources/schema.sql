-- 모든 테이블 삭제 (순서 주의)
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS spatial_feature CASCADE;
DROP TABLE IF EXISTS complaint_like CASCADE;
DROP TABLE IF EXISTS post_like CASCADE;
DROP TABLE IF EXISTS complaint_agency CASCADE;
DROP TABLE IF EXISTS complaint CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS agency CASCADE;

-- ENUM 타입 삭제 (더 이상 사용하지 않음 - VARCHAR로 대체)
DROP TYPE IF EXISTS agency_task_status CASCADE;
DROP TYPE IF EXISTS complaint_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

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
    birth_date DATE,
    addr VARCHAR(300),
    phone VARCHAR(20),
    created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
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
    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    user_no BIGINT NOT NULL REFERENCES app_user(user_no),
    like_count INTEGER DEFAULT 0,
    answer TEXT
);

-- 4. complaint_like
CREATE TABLE complaint_like (
    like_id BIGSERIAL PRIMARY KEY,
    complaint_no BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE,
    user_no BIGINT NOT NULL REFERENCES app_user(user_no) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(complaint_no, user_no)
);

-- 5. complaint_agency
CREATE TABLE complaint_agency (
    complaint_no BIGINT NOT NULL,
    agency_no BIGINT NOT NULL,
    PRIMARY KEY (complaint_no, agency_no)
);

-- 6. PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 7. spatial_feature
CREATE TABLE spatial_feature (
    feature_id BIGSERIAL PRIMARY KEY,
    feature_type VARCHAR(20),
    geom GEOMETRY(Geometry, 4326),
    addr_text VARCHAR(300),
    complaint_no BIGINT REFERENCES complaint(complaint_no) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. error_logs
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