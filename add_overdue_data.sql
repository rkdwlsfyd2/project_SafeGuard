/* =========================================================
   ADD 10 OVERDUE DATA (Strict Consistency)
   - Created Date: 4 days ago (Overdue condition: > 3 days)
   - Status: IN_PROGRESS (80%), UNPROCESSED (20%)
   - STRICT CONSISTENCY: Category ↔ Text ↔ Agency
========================================================= */

WITH
region_box AS (
  SELECT * FROM (VALUES
    ('서울특별시', 37.45, 37.67, 126.85, 127.10),
    ('부산광역시', 35.08, 35.23, 128.97, 129.18),
    ('대구광역시', 35.80, 35.93, 128.52, 128.70),
    ('인천광역시', 37.38, 37.55, 126.60, 126.80),
    ('광주광역시', 35.10, 35.22, 126.80, 126.95),
    ('대전광역시', 36.29, 36.40, 127.32, 127.48),
    ('울산광역시', 35.49, 35.62, 129.20, 129.40)
  ) AS t(region, lat_min, lat_max, lng_min, lng_max)
),
districts AS (
  SELECT * FROM (VALUES
    ('서울특별시', '강남구'),('서울특별시','서초구'),('서울특별시','송파구'),('서울특별시','마포구'),('서울특별시','용산구'),
    ('서울특별시','성동구'),('서울특별시','영등포구'),('서울특별시','강서구'),('서울특별시','양천구'),('서울특별시','종로구'),
    ('서울특별시','관악구'),('서울특별시','동작구'),
    ('부산광역시','해운대구'),('부산광역시','수영구'),('부산광역시','남구'),('부산광역시','동래구'),('부산광역시','부산진구'),('부산광역시','사하구'),
    ('대구광역시','수성구'),('대구광역시','달서구'),('대구광역시','중구'),('대구광역시','북구'),
    ('인천광역시','연수구'),('인천광역시','남동구'),('인천광역시','부평구'),('인천광역시','미추홀구'),('인천광역시','서구'),
    ('광주광역시','북구'),('광주광역시','서구'),('광주광역시','남구'),('광주광역시','동구'),
    ('대전광역시','유성구'),('대전광역시','서구'),('대전광역시','중구'),('대전광역시','동구'),
    ('울산광역시','남구'),('울산광역시','중구'),('울산광역시','동구'),('울산광역시','북구')
  ) AS t(region, district)
),
/* -------------------------
   Category templates
------------------------- */
tpl_env AS (
  SELECT * FROM (VALUES (
    ARRAY['생활쓰레기 무단투기 단속 요청드립니다.', '악취 발생으로 주변 생활이 어렵습니다.', '야간 소음이 심해 생활에 지장이 있습니다.', '미세먼지/분진이 심해 대기질 개선 조치 요청드립니다.', '하천/배수로 오염이 의심되어 수질 점검이 필요합니다.', '에너지 낭비 시설 개선 요청드립니다.']::text[],
    ARRAY['지속적으로 악취가 발생해 주민 불편이 큽니다. 원인 파악과 조치 부탁드립니다.', '무단투기가 반복되어 환경 미관이 훼손됩니다. 단속 및 정비 요청드립니다.', '소음이 야간에 심해 수면에 방해가 됩니다. 현장 점검 요청드립니다.', '대기 중 분진이 많아 호흡기 불편이 있습니다. 점검 및 저감 조치 부탁드립니다.', '하천 인근에서 오염이 의심됩니다. 수질 검사 및 정화 조치 요청드립니다.', '불필요한 에너지 사용이 지속됩니다. 절감 대책 검토 부탁드립니다.']::text[]
  )) AS t(titles, contents)
),
tpl_road AS (
  SELECT * FROM (VALUES (
    ARRAY['도로 포트홀로 차량 파손 우려가 있습니다.', '보도블록 파손으로 보행이 불편합니다.', '차선 도색이 마모되어 안전이 우려됩니다.', '가로등 고장으로 야간 시야 확보가 어렵습니다.', '도로 침하가 의심되어 점검이 필요합니다.']::text[],
    ARRAY['포트홀이 방치되어 사고 위험이 있습니다. 빠른 보수 요청드립니다.', '보도블록이 들떠 넘어질 위험이 있습니다.', '차선이 흐릿해 야간 주행이 위험합니다.', '가로등이 꺼져 있어 매우 어둡습니다.', '도로가 꺼지는 느낌이 있어 불안합니다.']::text[]
  )) AS t(titles, contents)
),
tpl_traffic AS (
  SELECT * FROM (VALUES (
    ARRAY['교차로 신호 주기 조정 요청드립니다.', '횡단보도 앞 불법 주정차 단속 부탁드립니다.', '버스 정류장 주변 혼잡 개선이 필요합니다.', '신호등 고장으로 교통 혼란이 발생합니다.', '보행자 보호구역 안전 조치 요청드립니다.']::text[],
    ARRAY['출퇴근 시간 교통 정체가 심합니다.', '불법 주정차로 시야 확보가 어렵습니다.', '정류장 인근 혼잡으로 사고 위험이 있습니다.', '신호등이 정상 작동하지 않습니다.', '보호구역 내 과속 차량이 많습니다.']::text[]
  )) AS t(titles, contents)
),
tpl_admin AS (
  SELECT * FROM (VALUES (
    ARRAY['위험 시설물 점검 요청드립니다.', '어린이 보호구역 안전 조치가 필요합니다.', 'CCTV 추가 설치 검토 요청드립니다.', '재난 취약 구역 점검이 필요합니다.', '공공 안전 표지 정비 요청드립니다.']::text[],
    ARRAY['시설물 노후로 안전사고가 우려됩니다.', '보호구역 안전 시설이 부족합니다.', '사각지대가 있어 안전 우려가 큽니다.', '취약 구역에 대한 점검이 필요합니다.', '안내 표지가 훼손되어 혼란이 있습니다.']::text[]
  )) AS t(titles, contents)
),
tpl_misc AS (
  SELECT * FROM (VALUES (
    ARRAY['민원 처리 진행 상황 공유 요청드립니다.', '관련 부서 안내 요청드립니다.', '현장 확인 후 조치 요청드립니다.']::text[],
    ARRAY['접수된 민원에 대한 진행 상황이 궁금합니다.', '어느 부서에서 담당하는지 안내 부탁드립니다.', '현장 확인 후 필요한 조치를 부탁드립니다.']::text[]
  )) AS t(titles, contents)
),

seq AS (
  SELECT gs AS idx FROM generate_series(1, 10) gs
),

/* OVERDUE PLAN: Created 4 days ago */
created_plan AS (
  SELECT
    idx,
    NOW() - interval '8 days' + (random() * interval '12 hours') AS created_date
  FROM seq
),

region_plan AS (
  SELECT
    cp.idx,
    cp.created_date,
    CASE WHEN random() < 0.55 THEN '서울특별시' ELSE (ARRAY['부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시'])[1+floor(random()*7)::int] END AS region
  FROM created_plan cp
),

district_plan AS (
  SELECT
    rp.idx,
    rp.created_date,
    rp.region,
    (SELECT d.district FROM districts d WHERE d.region = rp.region ORDER BY random() LIMIT 1) AS district
  FROM region_plan rp
),

category_plan AS (
  SELECT
    dp.*,
    (ARRAY['교통','도로','환경','행정·안전','기타'])[1+floor(random()*5)::int] AS category
  FROM district_plan dp
),

geo_plan AS (
  SELECT
    cp.idx, cp.created_date, cp.region, cp.district, cp.category,
    rb.lat_min + random()*(rb.lat_max - rb.lat_min) AS latitude,
    rb.lng_min + random()*(rb.lng_max - rb.lng_min) AS longitude
  FROM category_plan cp
  JOIN region_box rb ON rb.region = cp.region
),

user_pick AS (
  SELECT
    gp.*,
    (SELECT u.user_no FROM app_user u WHERE u.role='USER' ORDER BY random() LIMIT 1) AS user_no
  FROM geo_plan gp
),

text_plan AS (
  SELECT
    up.*,
    CASE up.category
      WHEN '환경' THEN (SELECT titles[1+floor(random()*array_length(titles,1))::int] FROM tpl_env)
      WHEN '도로' THEN (SELECT titles[1+floor(random()*array_length(titles,1))::int] FROM tpl_road)
      WHEN '교통' THEN (SELECT titles[1+floor(random()*array_length(titles,1))::int] FROM tpl_traffic)
      WHEN '행정·안전' THEN (SELECT titles[1+floor(random()*array_length(titles,1))::int] FROM tpl_admin)
      ELSE (SELECT titles[1+floor(random()*array_length(titles,1))::int] FROM tpl_misc)
    END AS title,
    CASE up.category
      WHEN '환경' THEN (SELECT contents[1+floor(random()*array_length(contents,1))::int] FROM tpl_env)
      WHEN '도로' THEN (SELECT contents[1+floor(random()*array_length(contents,1))::int] FROM tpl_road)
      WHEN '교통' THEN (SELECT contents[1+floor(random()*array_length(contents,1))::int] FROM tpl_traffic)
      WHEN '행정·안전' THEN (SELECT contents[1+floor(random()*array_length(contents,1))::int] FROM tpl_admin)
      ELSE (SELECT contents[1+floor(random()*array_length(contents,1))::int] FROM tpl_misc)
    END AS content
  FROM user_pick up
)

/* Insert 10 Overdue Complaints */
INSERT INTO complaint (
  category, title, content, address, latitude, longitude,
  status, created_date, user_no, like_count,
  completed_date, updated_date, answer
)
SELECT
  tp.category, tp.title, tp.content,
  tp.region || ' ' || tp.district AS address,
  tp.latitude, tp.longitude,
  CASE WHEN random() < 0.2 THEN 'UNPROCESSED' ELSE 'IN_PROGRESS' END AS status,
  tp.created_date,
  tp.user_no,
  0,
  NULL, NULL, NULL -- No completion, No answer
FROM text_plan tp;

/* Agency Mapping for New Complaints */
DO $$
DECLARE
  r RECORD;
  v_city TEXT;
  v_local BIGINT;
  v_central BIGINT;
BEGIN
  -- Insert mapping ONLY for complaints created in the last minute (the ones we just added)
  FOR r IN
    SELECT complaint_no, address, category
    FROM complaint
    WHERE created_date > NOW() - interval '10 days'
  LOOP
    v_city := split_part(r.address, ' ', 1);

    -- LOCAL
    SELECT agency_no INTO v_local FROM agency WHERE agency_type='LOCAL' AND agency_name=v_city LIMIT 1;
    IF v_local IS NULL THEN
        SELECT agency_no INTO v_local FROM agency WHERE agency_type='LOCAL' ORDER BY random() LIMIT 1;
    END IF;

    -- CENTRAL
    SELECT a.agency_no INTO v_central FROM agency a WHERE a.agency_type='CENTRAL' AND (
      (r.category='환경' AND (a.agency_name LIKE '%환경%' OR a.agency_name LIKE '%기후%' OR a.agency_name LIKE '%에너지%')) OR
      (r.category='도로' AND (a.agency_name LIKE '%국토%' OR a.agency_name LIKE '%도로%' OR a.agency_name LIKE '%교통%' OR a.agency_name LIKE '%시설%')) OR
      (r.category='교통' AND (a.agency_name LIKE '%경찰%' OR a.agency_name LIKE '%교통%')) OR
      (r.category='행정·안전' AND (a.agency_name LIKE '%행정%' OR a.agency_name LIKE '%안전%' OR a.agency_name LIKE '%재난%')) OR
      (r.category='기타')
    ) ORDER BY random() LIMIT 1;
    
    IF v_central IS NULL THEN
        SELECT agency_no INTO v_central FROM agency WHERE agency_type='CENTRAL' ORDER BY random() LIMIT 1;
    END IF;

    INSERT INTO complaint_agency (complaint_no, agency_no) VALUES (r.complaint_no, v_local);
    INSERT INTO complaint_agency (complaint_no, agency_no) VALUES (r.complaint_no, v_central);
  END LOOP;
END $$;

/* Spatial Feature for New Complaints */
INSERT INTO spatial_feature (feature_type, geom, addr_text, complaint_no, created_at)
SELECT
  'POINT',
  ST_SetSRID(ST_Point(c.longitude, c.latitude), 4326),
  c.address,
  c.complaint_no,
  c.created_date
FROM complaint c
WHERE c.created_date > NOW() - interval '10 days';
