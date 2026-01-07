-- =========================================================
-- Final DDL (PostgreSQL + PostGIS)
-- - ENUM 적용: user_role, complaint_status, agency_task_status
-- - 기관 마스터(agency) + 기관계정(app_user.agency_no)
-- - 민원-기관 배정(complaint_agency) 복합 PK
-- - phone: VARCHAR(20)
-- - DEFAULT 문자열 따옴표 처리
-- - PostGIS geometry + GIST index
-- =========================================================

-- 0) Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1) Drop order (dependency safe)
DROP TABLE IF EXISTS post_like CASCADE;
DROP TABLE IF EXISTS complaint_file CASCADE;
DROP TABLE IF EXISTS complaint_reply CASCADE;
DROP TABLE IF EXISTS complaint_history CASCADE;
DROP TABLE IF EXISTS spatial_feature CASCADE;
DROP TABLE IF EXISTS complaint_agency CASCADE;
DROP TABLE IF EXISTS complaint CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS agency CASCADE;

-- 2) Drop types (when re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agency_task_status') THEN
    DROP TYPE agency_task_status;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') THEN
    DROP TYPE complaint_status;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    DROP TYPE user_role;
  END IF;
END $$;

-- 3) ENUM Types
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'AGENCY');

CREATE TYPE complaint_status AS ENUM (
  'RECEIVED',        -- 접수
  'IN_PROGRESS',     -- 처리중
  'COMPLETED',       -- 완료
  'REJECTED',        -- 반려/부적합
  'CANCELLED'        -- 취소
);

CREATE TYPE agency_task_status AS ENUM (
  'ASSIGNED',        -- 배정됨
  'IN_PROGRESS',     -- 기관 처리중
  'COMPLETED',       -- 기관 처리완료
  'REJECTED'         -- 기관 반려
);

-- =========================================================
-- 4) agency (기관 마스터)
-- =========================================================
CREATE TABLE agency (
  agency_no    BIGSERIAL PRIMARY KEY,                 -- 기관 PK
  agency_type  VARCHAR(20)  NOT NULL,                 -- 기관 유형(지자체/중앙부처/공기업 등)
  agency_name  VARCHAR(200) NOT NULL,                 -- 기관명
  region_code  VARCHAR(20),                           -- 관할 코드(지자체면 주로 사용)
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP  -- 생성 시각
);

COMMENT ON TABLE agency IS '기관(지자체/행정기관) 마스터';
COMMENT ON COLUMN agency.agency_type IS '기관 유형(지자체/중앙부처/공기업 등)';
COMMENT ON COLUMN agency.region_code IS '관할 지역 코드(지자체 관할 구분용)';

ALTER TABLE agency
ADD CONSTRAINT uq_agency_name_region UNIQUE (agency_name, region_code);

CREATE INDEX idx_agency_region_code ON agency(region_code);

-- =========================================================
-- 5) app_user (로그인 주체)
-- =========================================================
CREATE TABLE app_user (
  user_no      BIGSERIAL PRIMARY KEY,                 -- 사용자 PK
  user_id      VARCHAR(50)  NOT NULL,                 -- 로그인 ID
  pw           VARCHAR(255) NOT NULL,                 -- 암호화 비밀번호
  name         VARCHAR(50)  NOT NULL,                 -- 이름
  birth_date   DATE         NOT NULL,                 -- 생년월일
  addr         VARCHAR(100) NOT NULL,                 -- 주소
  phone        VARCHAR(20)  NOT NULL,                 -- 전화번호
  email        VARCHAR(100),                          -- 이메일 (연락처용)
  created_date TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,-- 가입 일시
  role         user_role    NOT NULL,                 -- 권한(USER/ADMIN/AGENCY)
  agency_no    BIGINT       REFERENCES agency(agency_no) -- 기관계정 소속
);

COMMENT ON TABLE app_user IS '시스템 사용자(일반/관리자/기관계정)';
COMMENT ON COLUMN app_user.role IS '권한(USER/ADMIN/AGENCY)';
COMMENT ON COLUMN app_user.agency_no IS '기관 계정 소속 기관 FK(일반/관리자는 NULL)';

ALTER TABLE app_user
ADD CONSTRAINT uq_app_user_user_id UNIQUE (user_id);

-- 기관 계정이면 agency_no 필수, 아니면 NULL 강제(권장)
ALTER TABLE app_user
ADD CONSTRAINT chk_app_user_agency_binding
CHECK (
  (role = 'AGENCY' AND agency_no IS NOT NULL)
  OR (role <> 'AGENCY' AND agency_no IS NULL)
);

CREATE INDEX idx_app_user_agency_no ON app_user(agency_no);

-- =========================================================
-- 6) complaint (민원 본문)
-- =========================================================
CREATE TABLE complaint (
  complaint_no   BIGSERIAL PRIMARY KEY,                 -- 민원 PK
  category       VARCHAR(50)   NOT NULL,                 -- 분류
  title          VARCHAR(200)  NOT NULL,                 -- 제목
  content        TEXT          NOT NULL,                 -- 내용(TEXT 권장)
  status         complaint_status NOT NULL DEFAULT 'RECEIVED', -- 전체 상태(요약)
  is_public      BOOLEAN       NOT NULL DEFAULT TRUE,    -- 공개 여부
  created_date   TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 접수 일시
  updated_date   TIMESTAMPTZ,                           -- 수정 일시
  completed_date TIMESTAMPTZ,                           -- 완료 일시
  user_no        BIGINT        NOT NULL REFERENCES app_user(user_no) -- 작성자
);

COMMENT ON TABLE complaint IS '민원 접수 본문';
COMMENT ON COLUMN complaint.status IS '민원 전체 상태(요약). 기관별 상세 상태는 complaint_agency.status 참고';

CREATE INDEX idx_complaint_user_no     ON complaint(user_no);
CREATE INDEX idx_complaint_status      ON complaint(status);
CREATE INDEX idx_complaint_created_dt  ON complaint(created_date);

-- =========================================================
-- 7) complaint_agency (민원-기관 배정)
-- - 민원 1건이 여러 기관으로 분기/협업 가능
-- - "2개 기관 배정"은 서비스 로직에서 2건 insert로 제어
-- =========================================================
CREATE TABLE complaint_agency (
  complaint_no    BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE, -- 민원 FK
  agency_no       BIGINT NOT NULL REFERENCES agency(agency_no),                          -- 기관 FK
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,                        -- 배정 시각
  status          agency_task_status NOT NULL DEFAULT 'ASSIGNED',                        -- 기관별 상태
  memo            TEXT,                                                                  -- 기관별 메모
  assigned_by     BIGINT REFERENCES app_user(user_no),                                   -- 배정자(관리자/시스템)
  handler_user_no BIGINT REFERENCES app_user(user_no),                                   -- 실제 처리 담당자(기관 계정, 선택)
  PRIMARY KEY (complaint_no, agency_no)                                                  -- 복합 PK(중복 배정 방지)
);

COMMENT ON TABLE complaint_agency IS '민원-기관 배정 관계(기관별 처리상태/메모 포함)';
COMMENT ON COLUMN complaint_agency.status IS '기관 기준 처리상태(ASSIGNED/IN_PROGRESS/COMPLETED/REJECTED)';
COMMENT ON COLUMN complaint_agency.assigned_by IS '배정 수행 사용자(관리자/시스템)';
COMMENT ON COLUMN complaint_agency.handler_user_no IS '실제 처리 담당 기관계정 사용자(선택)';

CREATE INDEX idx_ca_agency_no   ON complaint_agency(agency_no);
CREATE INDEX idx_ca_status      ON complaint_agency(status);
CREATE INDEX idx_ca_assigned_at ON complaint_agency(assigned_at);

-- =========================================================
-- 8) complaint_history (민원 처리 이력)
-- =========================================================
CREATE TABLE complaint_history (
  history_no    BIGSERIAL PRIMARY KEY,                 -- 이력 PK
  status        complaint_status,                       -- 변경 상태(민원 전체 기준)
  memo          TEXT,                                  -- 메모
  created_date  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 기록 시각
  complaint_no  BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE, -- 민원 FK
  user_no       BIGINT NOT NULL REFERENCES app_user(user_no) -- 기록자(관리자/기관)
);

COMMENT ON TABLE complaint_history IS '민원 상태 변경 이력(감사/추적)';

CREATE INDEX idx_history_complaint_no ON complaint_history(complaint_no);
CREATE INDEX idx_history_user_no      ON complaint_history(user_no);
CREATE INDEX idx_history_created_dt   ON complaint_history(created_date);

-- =========================================================
-- 9) complaint_reply (민원 답변)
-- =========================================================
CREATE TABLE complaint_reply (
  reply_no      BIGSERIAL PRIMARY KEY,                 -- 답변 PK
  content       TEXT NOT NULL,                          -- 답변 내용
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 작성 시각
  complaint_no  BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE, -- 민원 FK
  user_no       BIGINT NOT NULL REFERENCES app_user(user_no) -- 작성자(기관/관리자)
);

COMMENT ON TABLE complaint_reply IS '민원 답변';

CREATE INDEX idx_reply_complaint_no ON complaint_reply(complaint_no);
CREATE INDEX idx_reply_user_no      ON complaint_reply(user_no);

-- =========================================================
-- 10) complaint_file (민원 첨부 파일)
-- =========================================================
CREATE TABLE complaint_file (
  file_no       BIGSERIAL PRIMARY KEY,                 -- 파일 PK
  file_url      VARCHAR(300) NOT NULL,                 -- 파일 URL/경로
  file_type     VARCHAR(20),                           -- 파일 타입
  uploaded_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 업로드 시각
  complaint_no  BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE -- 민원 FK
);

COMMENT ON TABLE complaint_file IS '민원 첨부 파일';

CREATE INDEX idx_file_complaint_no ON complaint_file(complaint_no);

-- =========================================================
-- 11) spatial_feature (민원 공간정보)
-- =========================================================
CREATE TABLE spatial_feature (
  feature_id    BIGSERIAL PRIMARY KEY,                 -- 공간객체 PK
  feature_type  VARCHAR(20) NOT NULL,                  -- POINT/LINESTRING/POLYGON 등
  geom          geometry(Geometry, 4326) NOT NULL,      -- 공간정보(4326)
  addr_text     VARCHAR(300),                          -- 주소 텍스트
  admin_code    VARCHAR(20),                           -- 행정코드
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 생성 시각
  complaint_no  BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE -- 민원 FK
);

COMMENT ON TABLE spatial_feature IS '민원 공간정보(PostGIS)';

ALTER TABLE spatial_feature
ADD CONSTRAINT chk_spatial_feature_type
CHECK (feature_type IN ('POINT', 'LINESTRING', 'POLYGON', 'GEOMETRY'));

CREATE INDEX idx_spatial_geom         ON spatial_feature USING GIST (geom);
CREATE INDEX idx_spatial_complaint_no ON spatial_feature(complaint_no);
CREATE INDEX idx_spatial_admin_code   ON spatial_feature(admin_code);

-- =========================================================
-- 12) post_like (공감/좋아요)
-- =========================================================
CREATE TABLE post_like (
  like_id      BIGSERIAL PRIMARY KEY,                 -- 좋아요 PK
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 생성 시각
  user_no      BIGINT NOT NULL REFERENCES app_user(user_no) ON DELETE CASCADE, -- 누른 사용자
  complaint_no BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE -- 대상 민원
);

COMMENT ON TABLE post_like IS '민원 공감/좋아요';

ALTER TABLE post_like
ADD CONSTRAINT uq_post_like UNIQUE (user_no, complaint_no);

CREATE INDEX idx_like_complaint_no ON post_like(complaint_no);
CREATE INDEX idx_like_user_no      ON post_like(user_no);
