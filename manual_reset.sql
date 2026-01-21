-- DBeaver에서 이 스크립트를 실행하면 데이터가 초기화됩니다.
-- (전체 선택 후 ALT+X 또는 Execute Script 버튼 실행)

-- 1. 기존 테이블 삭제 (순서 중요)
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS spatial_feature CASCADE;
DROP TABLE IF EXISTS complaint_like CASCADE;
DROP TABLE IF EXISTS post_like CASCADE;
DROP TABLE IF EXISTS complaint_agency CASCADE;
DROP TABLE IF EXISTS complaint CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS agency CASCADE;
DROP TABLE IF EXISTS notification CASCADE;

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

SELECT 'Reset Complete' as status;

-- ================================
-- Notification (알림)
-- ================================

CREATE TABLE notification (
    notification_id BIGSERIAL PRIMARY KEY,

    -- 알림 수신자 (민원 작성자)
    user_no BIGINT NOT NULL
        REFERENCES app_user(user_no)
        ON DELETE CASCADE,

    -- 관련 민원
    complaint_no BIGINT NOT NULL
        REFERENCES complaint(complaint_no)
        ON DELETE CASCADE,

    -- 알림 유형
    -- ANSWER_CREATED, ANSWER_UPDATED, STATUS_CHANGED
    type VARCHAR(30) NOT NULL,

    -- 사용자에게 보여줄 메시지
    message VARCHAR(500) NOT NULL,

    -- 읽음 여부
    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    -- 읽은 시각
    read_at TIMESTAMPTZ,

    -- 알림 생성 시각
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 조회 성능을 위한 인덱스
CREATE INDEX idx_notification_user_no
    ON notification(user_no);

CREATE INDEX idx_notification_user_no_is_read
    ON notification(user_no, is_read);

CREATE INDEX idx_notification_complaint_no
    ON notification(complaint_no);
