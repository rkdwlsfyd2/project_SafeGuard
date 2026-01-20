/* =========================================================
   SafeGuard Overdue Dummy Data (40 Rows - Delayed Focus)
   - Total complaints: exactly 40
   - Objective: Test "지연 민원 상세 관리" (SLA Overdue) Dashboard
   - Date: Fixed between 2026-01-10 and 2026-01-14 (Overdue as of Jan 20)
   - Status: Mixed (RECEIVED, UNPROCESSED, IN_PROGRESS)
========================================================= */

/* 1) Preconditions Check */
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM agency WHERE agency_type='LOCAL') THEN
    RAISE EXCEPTION 'agency(LOCAL) 데이터가 없습니다. 먼저 기본 프로젝트 데이터를 서버에 로딩해주세요.';
  END IF;
END $$;

/* 2) Generate 40 Overdue Complaints */
DO $$
DECLARE
  v_user_no BIGINT;
  v_complaint_no BIGINT;
  v_category TEXT;
  v_title TEXT;
  v_content TEXT;
  v_status TEXT;
  v_created TIMESTAMP;
  v_region TEXT;
  v_district TEXT;
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_agency_local BIGINT;
  v_agency_central BIGINT;
  
  -- Templates
  env_titles TEXT[] := ARRAY['생활쓰레기 무단투기 단속 요청', '악취 발생 정밀 점검 필요', '야간 소음 민원'];
  env_contents TEXT[] := ARRAY['지속적인 악취로 고통받고 있습니다.', '쓰레기 무단투기가 너무 심각합니다.', '밤마다 소음이 들려서 잠을 못 잡니다.'];
  
  road_titles TEXT[] := ARRAY['도로 포트홀 긴급 보수 요청', '보도블록 파손 신고', '가로등 고장 수리 요청'];
  road_contents TEXT[] := ARRAY['차량 타이어 파손 위험이 큽니다.', '지나가다 넘어질 뻔했습니다.', '길이 너무 어두워서 위험합니다.'];
  
  traffic_titles TEXT[] := ARRAY['교차로 신호 주기 조정', '불법 주정차 단속 요청', '횡단보도 도색 마모'];
  traffic_contents TEXT[] := ARRAY['신호 대기가 너무 깁니다.', '차들이 인도를 다 막고 있어요.', '차선이 안 보여서 사고 날 것 같습니다.'];
  
  admin_titles TEXT[] := ARRAY['노후 담장 붕괴 위험', 'CCTV 추가 설치 요청', '재난 대비 점검 필요'];
  admin_contents TEXT[] := ARRAY['담장이 기울어져서 위험해 보입니다.', '방범용 카메라가 더 필요합니다.', '장마철 대비 배수로 점검 부탁드립니다.'];

  categories TEXT[] := ARRAY['환경', '도로', '교통', '행정·안전'];
  regions TEXT[] := ARRAY['서울특별시', '부산광역시', '대구광역시', '인천광역시'];
  seoul_gu TEXT[] := ARRAY['강남구', '서초구', '송파구', '마포구', '영등포구'];
  busan_gu TEXT[] := ARRAY['해운대구', '진구', '수영구', '동래구', '사하구'];
  daegu_gu TEXT[] := ARRAY['수성구', '달서구', '중구', '남구', '북구'];
  incheon_gu TEXT[] := ARRAY['부평구', '송도구', '미추홀구', '남동구', '계양구'];
  
  i INT;
BEGIN
  -- 40개 지연 민원 생성 루프
  FOR i IN 1..40 LOOP
    -- Random Category
    v_category := categories[1 + floor(random()*4)::int];
    
    -- Random Overdue Date (Jan 10 ~ Jan 14, 2026) -> Overdue by 3+ business days as of Jan 20
    v_created := '2026-01-10 09:00:00'::timestamp + (random() * interval '4 days');
    
    -- Pick Title/Content based on Category
    IF v_category = '환경' THEN
      v_title := env_titles[1 + floor(random()*3)::int];
      v_content := env_contents[1 + floor(random()*3)::int];
    ELSIF v_category = '도로' THEN
      v_title := road_titles[1 + floor(random()*3)::int];
      v_content := road_contents[1 + floor(random()*3)::int];
    ELSIF v_category = '교통' THEN
      v_title := traffic_titles[1 + floor(random()*3)::int];
      v_content := traffic_contents[1 + floor(random()*3)::int];
    ELSE
      v_title := admin_titles[1 + floor(random()*3)::int];
      v_content := admin_contents[1 + floor(random()*3)::int];
    END IF;

    -- Status: Align with backend Enum (UNPROCESSED, IN_PROGRESS)
    -- RECEIVED is not in the Enum anymore, so we use UNPROCESSED (66%) and IN_PROGRESS (33%)
    IF (i % 3 = 2) THEN v_status := 'IN_PROGRESS';
    ELSE v_status := 'UNPROCESSED';
    END IF;

    -- Address
    v_region := regions[1 + floor(random()*array_length(regions, 1))::int];
    IF v_region = '서울특별시' THEN 
      v_district := seoul_gu[1 + floor(random()*array_length(seoul_gu, 1))::int];
    ELSIF v_region = '부산광역시' THEN
      v_district := busan_gu[1 + floor(random()*array_length(busan_gu, 1))::int];
    ELSIF v_region = '대구광역시' THEN
      v_district := daegu_gu[1 + floor(random()*array_length(daegu_gu, 1))::int];
    ELSE -- 인천광역시
      v_district := incheon_gu[1 + floor(random()*array_length(incheon_gu, 1))::int];
    END IF;

    -- Random Coordinates (Approx Seoul)
    v_lat := 37.5 + (random() * 0.1);
    v_lng := 126.9 + (random() * 0.1);

    -- Random existing user
    SELECT user_no INTO v_user_no FROM app_user WHERE role='USER' ORDER BY random() LIMIT 1;
    IF v_user_no IS NULL THEN v_user_no := 1; END IF;

    -- 2-1) Insert Complaint
    INSERT INTO complaint (
      category, title, content, address, latitude, longitude, status, created_date, updated_date, user_no, is_public
    ) VALUES (
      v_category, v_title, v_content, v_region || ' ' || v_district, v_lat, v_lng, v_status, v_created, v_created, v_user_no, TRUE
    ) RETURNING complaint_no INTO v_complaint_no;

    -- 2-2) Assign LOCAL Agency
    SELECT agency_no INTO v_agency_local FROM agency WHERE agency_type='LOCAL' AND (agency_name = v_region OR agency_name = '서울특별시') ORDER BY (agency_name = v_region) DESC LIMIT 1;
    IF v_agency_local IS NOT NULL THEN
      INSERT INTO complaint_agency (complaint_no, agency_no) VALUES (v_complaint_no, v_agency_local);
    END IF;

    -- 2-3) Assign CENTRAL Agency (Category match)
    SELECT agency_no INTO v_agency_central FROM agency 
    WHERE agency_type='CENTRAL' 
      AND (
        (v_category='환경' AND (agency_name LIKE '%환경%' OR agency_name LIKE '%기후%')) OR
        (v_category='도로' AND (agency_name LIKE '%국토%' OR agency_name LIKE '%도로%')) OR
        (v_category='교통' AND (agency_name LIKE '%경찰%' OR agency_name LIKE '%교통%')) OR
        (v_category='행정·안전' AND (agency_name LIKE '%행정%' OR agency_name LIKE '%안전%')) OR
        (v_category='기타')
      )
    ORDER BY random() LIMIT 1;
    
    IF v_agency_central IS NOT NULL THEN
      INSERT INTO complaint_agency (complaint_no, agency_no) VALUES (v_complaint_no, v_agency_central);
    END IF;

    -- 2-4) Create Spatial Feature (Map Marker)
    INSERT INTO spatial_feature (feature_type, geom, addr_text, complaint_no, created_at)
    VALUES ('POINT', ST_SetSRID(ST_Point(v_lng, v_lat), 4326), v_region || ' ' || v_district, v_complaint_no, v_created);

  END LOOP;
END $$;

-- Validation Snippets
SELECT status, count(*) FROM complaint WHERE created_date < '2026-01-16' GROUP BY status;
SELECT 'Overdue Dummy Data 40 rows created successfully' as status;
