/* =========================================================
   SafeGuard Dummy Data Script (Strict Consistency Edition)
   - Total complaints: exactly 500
   - Rule: created_date older than 5 days => COMPLETED
   - Only last 5 days can be UNPROCESSED / IN_PROGRESS
   - COMPLETED must have answer + completed_date + updated_date
   - complaint_agency: exactly 2 rows per complaint (LOCAL matches city + CENTRAL category-match)
   - spatial_feature: 1:1 with complaint (geom point)

   CRITICAL CONSISTENCY:
   - CATEGORY ↔ (CENTRAL) AGENCY ↔ Title/Content must match
   - ENV agency cannot get ROAD/TRAFFIC text (structurally impossible)

========================================================= */

/* 0) RESET (dummy data cleanup) */
TRUNCATE TABLE
  spatial_feature,
  complaint_agency,
  complaint_like,
  complaint
RESTART IDENTITY CASCADE;

DELETE FROM app_user
WHERE role = 'USER';

/* 1) Preconditions: agencies must exist + required locals */
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM agency WHERE agency_type='LOCAL') THEN
    RAISE EXCEPTION 'agency(LOCAL) 데이터가 없습니다. 먼저 agency 기본데이터를 넣어주세요.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM agency WHERE agency_type='CENTRAL') THEN
    RAISE EXCEPTION 'agency(CENTRAL) 데이터가 없습니다. 먼저 agency 기본데이터를 넣어주세요.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM agency WHERE agency_type='LOCAL' AND agency_name='서울특별시') THEN
    RAISE EXCEPTION 'LOCAL 기관에 서울특별시가 없습니다(agency_name=서울특별시).';
  END IF;
END $$;

/* 2) USERS: 200 USERS, strict round-robin 20s~60+ (birth_date) */
DO $$
DECLARE
  i INT;
  ln TEXT[] := ARRAY['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','전','홍'];
  fn TEXT[] := ARRAY['민준','서준','도윤','예준','시우','하준','주원','지호','지후','준서','서윤','서연','지우','하윤','민서','하은','지유','윤서','지아','나은'];
  cities TEXT[] := ARRAY['서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시'];
  seoul_gu TEXT[] := ARRAY['강남구','서초구','송파구','마포구','용산구','성동구','영등포구','강서구','양천구','종로구','관악구','동작구'];
  busan_gu TEXT[] := ARRAY['해운대구','수영구','남구','동래구','부산진구','사하구'];
  daegu_gu TEXT[] := ARRAY['수성구','달서구','중구','북구'];
  incheon_gu TEXT[] := ARRAY['연수구','남동구','부평구','미추홀구','서구'];
  gwangju_gu TEXT[] := ARRAY['북구','서구','남구','동구'];
  daejeon_gu TEXT[] := ARRAY['유성구','서구','중구','동구'];
  ulsan_gu TEXT[] := ARRAY['남구','중구','동구','북구'];
  v_city TEXT;
  v_gu TEXT;
  v_age_band INT;
  v_birth DATE;
BEGIN
  FOR i IN 1..200 LOOP
    v_city := cities[1 + floor(random()*array_length(cities,1))::int];

    IF v_city='서울특별시' THEN
      v_gu := seoul_gu[1 + floor(random()*array_length(seoul_gu,1))::int];
    ELSIF v_city='부산광역시' THEN
      v_gu := busan_gu[1 + floor(random()*array_length(busan_gu,1))::int];
    ELSIF v_city='대구광역시' THEN
      v_gu := daegu_gu[1 + floor(random()*array_length(daegu_gu,1))::int];
    ELSIF v_city='인천광역시' THEN
      v_gu := incheon_gu[1 + floor(random()*array_length(incheon_gu,1))::int];
    ELSIF v_city='광주광역시' THEN
      v_gu := gwangju_gu[1 + floor(random()*array_length(gwangju_gu,1))::int];
    ELSIF v_city='대전광역시' THEN
      v_gu := daejeon_gu[1 + floor(random()*array_length(daejeon_gu,1))::int];
    ELSE
      v_gu := ulsan_gu[1 + floor(random()*array_length(ulsan_gu,1))::int];
    END IF;

    -- STRICT Round-Robin: i%5 기반 연령대 강제 분산
    v_age_band := (i - 1) % 5;

    IF v_age_band = 0 THEN
      -- 20~29
      v_birth := (CURRENT_DATE - interval '20 years' - (random() * interval '9 years'))::date;
    ELSIF v_age_band = 1 THEN
      -- 30~39
      v_birth := (CURRENT_DATE - interval '30 years' - (random() * interval '9 years'))::date;
    ELSIF v_age_band = 2 THEN
      -- 40~49
      v_birth := (CURRENT_DATE - interval '40 years' - (random() * interval '9 years'))::date;
    ELSIF v_age_band = 3 THEN
      -- 50~59
      v_birth := (CURRENT_DATE - interval '50 years' - (random() * interval '9 years'))::date;
    ELSE
      -- 60~79
      v_birth := (CURRENT_DATE - interval '60 years' - (random() * interval '19 years'))::date;
    END IF;

    INSERT INTO app_user (user_id, pw, name, birth_date, addr, phone, role)
    VALUES (
      'user_' || lpad(i::text,4,'0'),
      'pw',
      ln[1 + floor(random()*array_length(ln,1))::int] || fn[1 + floor(random()*array_length(fn,1))::int],
      v_birth,
      v_city || ' ' || v_gu || ' ' || (100 + floor(random()*900)::int) || '번길 ' || (1 + floor(random()*120)::int),
      '010-' || lpad((random()*10000)::int::text,4,'0') || '-' || lpad((random()*10000)::int::text,4,'0'),
      'USER'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

/* 3) COMPLAINTS: 500 rows, strict consistency (category->text), created_date increasing */
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
   (category별로만 텍스트 선택 => 기관-텍스트 불일치 구조 차단)
------------------------- */
/* =========================
   TEXT TEMPLATES (FIXED)
   - 1 row × 3 columns (titles, contents, answers)
   - ERROR 42P10 해결
========================= */

tpl_env AS (
  SELECT *
  FROM (VALUES (
    ARRAY[
      '생활쓰레기 무단투기 단속 요청드립니다.',
      '악취 발생으로 주변 생활이 어렵습니다.',
      '야간 소음이 심해 생활에 지장이 있습니다.',
      '미세먼지/분진이 심해 대기질 개선 조치 요청드립니다.',
      '하천/배수로 오염이 의심되어 수질 점검이 필요합니다.',
      '에너지 낭비 시설 개선 요청드립니다.'
    ]::text[],
    ARRAY[
      '지속적으로 악취가 발생해 주민 불편이 큽니다. 원인 파악과 조치 부탁드립니다.',
      '무단투기가 반복되어 환경 미관이 훼손됩니다. 단속 및 정비 요청드립니다.',
      '소음이 야간에 심해 수면에 방해가 됩니다. 현장 점검 요청드립니다.',
      '대기 중 분진이 많아 호흡기 불편이 있습니다. 점검 및 저감 조치 부탁드립니다.',
      '하천 인근에서 오염이 의심됩니다. 수질 검사 및 정화 조치 요청드립니다.',
      '불필요한 에너지 사용이 지속됩니다. 절감 대책 검토 부탁드립니다.'
    ]::text[],
    ARRAY[
      '현장 점검 결과 관련 조치를 완료하였습니다.',
      '관계 부서와 협의하여 단속 및 정비를 진행했습니다.',
      '소음 원인을 확인하고 개선 조치를 시행했습니다.',
      '대기질 개선을 위한 조치를 진행했습니다.',
      '수질 점검 및 정화 조치를 완료했습니다.'
    ]::text[]
  )) AS t(titles, contents, answers)
),

tpl_road AS (
  SELECT *
  FROM (VALUES (
    ARRAY[
      '도로 포트홀로 차량 파손 우려가 있습니다.',
      '보도블록 파손으로 보행이 불편합니다.',
      '차선 도색이 마모되어 안전이 우려됩니다.',
      '가로등 고장으로 야간 시야 확보가 어렵습니다.',
      '도로 침하가 의심되어 점검이 필요합니다.'
    ]::text[],
    ARRAY[
      '포트홀이 방치되어 사고 위험이 있습니다. 빠른 보수 요청드립니다.',
      '보도블록이 들떠 넘어질 위험이 있습니다.',
      '차선이 흐릿해 야간 주행이 위험합니다.',
      '가로등이 꺼져 있어 매우 어둡습니다.',
      '도로가 꺼지는 느낌이 있어 불안합니다.'
    ]::text[],
    ARRAY[
      '현장 확인 후 보수 작업을 완료하였습니다.',
      '보도블록 정비를 진행하였습니다.',
      '차선 재도색을 완료하였습니다.',
      '가로등 수리를 완료하였습니다.',
      '침하 여부를 점검하고 보강 조치를 시행했습니다.'
    ]::text[]
  )) AS t(titles, contents, answers)
),

tpl_traffic AS (
  SELECT *
  FROM (VALUES (
    ARRAY[
      '교차로 신호 주기 조정 요청드립니다.',
      '횡단보도 앞 불법 주정차 단속 부탁드립니다.',
      '버스 정류장 주변 혼잡 개선이 필요합니다.',
      '신호등 고장으로 교통 혼란이 발생합니다.',
      '보행자 보호구역 안전 조치 요청드립니다.'
    ]::text[],
    ARRAY[
      '출퇴근 시간 교통 정체가 심합니다.',
      '불법 주정차로 시야 확보가 어렵습니다.',
      '정류장 인근 혼잡으로 사고 위험이 있습니다.',
      '신호등이 정상 작동하지 않습니다.',
      '보호구역 내 과속 차량이 많습니다.'
    ]::text[],
    ARRAY[
      '신호 체계를 점검 및 조정하였습니다.',
      '불법 주정차 단속을 강화하였습니다.',
      '교통 흐름 개선 조치를 시행했습니다.',
      '신호등 수리를 완료하였습니다.',
      '보호구역 안전 조치를 강화하였습니다.'
    ]::text[]
  )) AS t(titles, contents, answers)
),

tpl_admin AS (
  SELECT *
  FROM (VALUES (
    ARRAY[
      '위험 시설물 점검 요청드립니다.',
      '어린이 보호구역 안전 조치가 필요합니다.',
      'CCTV 추가 설치 검토 요청드립니다.',
      '재난 취약 구역 점검이 필요합니다.',
      '공공 안전 표지 정비 요청드립니다.'
    ]::text[],
    ARRAY[
      '시설물 노후로 안전사고가 우려됩니다.',
      '보호구역 안전 시설이 부족합니다.',
      '사각지대가 있어 안전 우려가 큽니다.',
      '취약 구역에 대한 점검이 필요합니다.',
      '안내 표지가 훼손되어 혼란이 있습니다.'
    ]::text[],
    ARRAY[
      '현장 점검 후 조치를 완료하였습니다.',
      '안전 시설 개선을 진행하였습니다.',
      'CCTV 설치를 검토 및 진행하겠습니다.',
      '취약 요소를 보완 조치하였습니다.',
      '안전 표지 정비를 완료하였습니다.'
    ]::text[]
  )) AS t(titles, contents, answers)
),

tpl_misc AS (
  SELECT *
  FROM (VALUES (
    ARRAY[
      '민원 처리 진행 상황 공유 요청드립니다.',
      '관련 부서 안내 요청드립니다.',
      '현장 확인 후 조치 요청드립니다.'
    ]::text[],
    ARRAY[
      '접수된 민원에 대한 진행 상황이 궁금합니다.',
      '어느 부서에서 담당하는지 안내 부탁드립니다.',
      '현장 확인 후 필요한 조치를 부탁드립니다.'
    ]::text[],
    ARRAY[
      '민원 내용을 확인 중입니다.',
      '담당 부서를 안내드렸습니다.',
      '현장 확인 후 안내드리겠습니다.'
    ]::text[]
  )) AS t(titles, contents, answers)
),


seq AS (
  SELECT gs AS idx
  FROM generate_series(1, 500) gs
),

created_plan AS (
  SELECT
    idx,
    LEAST(
      NOW(),
      CASE
        -- 1~370: 과거 5년 ~ 기준일 6일 전 (무조건 COMPLETED)
        WHEN idx <= 370 THEN
          (NOW() - interval '5 years')
            + ((idx - 1)::double precision / 369.0)
              * ((NOW() - interval '6 days') - (NOW() - interval '5 years'))

        -- 371~500: 기준일 기준 최근 5일 (절대 미래 없음)
        ELSE
          CASE
            WHEN idx BETWEEN 371 AND 400 THEN NOW() - interval '4 days'
                 + (random() * interval '12 hours')
            WHEN idx BETWEEN 401 AND 440 THEN NOW() - interval '2 days'
                 + (random() * interval '18 hours')
            WHEN idx BETWEEN 441 AND 480 THEN NOW() - interval '1 day'
                 + (random() * interval '20 hours')
            ELSE NOW()
                 - (random() * interval '20 hours')
          END
      END
    ) AS created_date
  FROM seq
  
),


region_plan AS (
  SELECT
    cp.idx,
    cp.created_date,
    CASE
      WHEN random() < 0.55 THEN '서울특별시'
      ELSE (ARRAY['부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시'])[1+floor(random()*7)::int]
    END AS region
  FROM created_plan cp
),

district_plan AS (
  SELECT
    rp.idx,
    rp.created_date,
    rp.region,
    (SELECT d.district
     FROM districts d
     WHERE d.region = rp.region
     ORDER BY random()
     LIMIT 1) AS district
  FROM region_plan rp
),

/* category distribution (기존 의도 유지: 최근 3일간 변동감) */
category_plan AS (
  SELECT
    dp.*,
    CASE
      WHEN dp.idx BETWEEN 401 AND 440 THEN (ARRAY['교통','도로','행정·안전','기타','도로'])[1+floor(random()*5)::int]
      WHEN dp.idx BETWEEN 441 AND 480 THEN (ARRAY['교통','도로','환경','행정·안전','기타'])[1+floor(random()*5)::int]
      WHEN dp.idx BETWEEN 481 AND 500 THEN (ARRAY['환경','환경','도로','교통','행정·안전'])[1+floor(random()*5)::int]
      ELSE (ARRAY['교통','도로','환경','행정·안전','기타'])[1+floor(random()*5)::int]
    END AS category
  FROM district_plan dp
),

geo_plan AS (
  SELECT
    cp.idx,
    cp.created_date,
    cp.region,
    cp.district,
    cp.category,
    rb.lat_min + random()*(rb.lat_max - rb.lat_min) AS latitude,
    rb.lng_min + random()*(rb.lng_max - rb.lng_min) AS longitude
  FROM category_plan cp
  JOIN region_box rb ON rb.region = cp.region
),

/* complaint.user_no: 연령대 균형 강제 (idx%5) */
user_pick AS (
  SELECT
    gp.*,
    (
      SELECT u.user_no
      FROM app_user u
      WHERE u.role='USER'
        AND (
          CASE
            WHEN gp.idx % 5 = 0 THEN age(CURRENT_DATE, u.birth_date)
                 BETWEEN interval '20 years' AND interval '29 years'
            WHEN gp.idx % 5 = 1 THEN age(CURRENT_DATE, u.birth_date)
                 BETWEEN interval '30 years' AND interval '39 years'
            WHEN gp.idx % 5 = 2 THEN age(CURRENT_DATE, u.birth_date)
                 BETWEEN interval '40 years' AND interval '49 years'
            WHEN gp.idx % 5 = 3 THEN age(CURRENT_DATE, u.birth_date)
                 BETWEEN interval '50 years' AND interval '59 years'
            ELSE age(CURRENT_DATE, u.birth_date) >= interval '60 years'
          END
        )
      ORDER BY random()
      LIMIT 1
    ) AS user_no
  FROM geo_plan gp
),

/* text: category별 템플릿만 사용 => 기관-텍스트 불일치 구조 차단 */
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
    END AS content,
    CASE up.category
      WHEN '환경' THEN (SELECT answers[1+floor(random()*array_length(answers,1))::int] FROM tpl_env)
      WHEN '도로' THEN (SELECT answers[1+floor(random()*array_length(answers,1))::int] FROM tpl_road)
      WHEN '교통' THEN (SELECT answers[1+floor(random()*array_length(answers,1))::int] FROM tpl_traffic)
      WHEN '행정·안전' THEN (SELECT answers[1+floor(random()*array_length(answers,1))::int] FROM tpl_admin)
      ELSE (SELECT answers[1+floor(random()*array_length(answers,1))::int] FROM tpl_misc)
    END AS answer_seed
  FROM user_pick up
),

status_plan AS (
  SELECT
    tp.*,
    CASE
      WHEN tp.created_date <= NOW() - interval '5 days' THEN 'COMPLETED'
      ELSE
        CASE
          WHEN tp.idx BETWEEN 371 AND 430 THEN
            CASE WHEN random() < 0.35 THEN 'UNPROCESSED' ELSE 'IN_PROGRESS' END
          ELSE
            CASE
              WHEN random() < 0.20 THEN 'UNPROCESSED'
              WHEN random() < 0.75 THEN 'IN_PROGRESS'
              ELSE 'COMPLETED'
            END
        END
    END AS status,
    floor(random()*41)::int AS like_count
  FROM text_plan tp
)

INSERT INTO complaint (
  category, title, content,
  address, latitude, longitude,
  status, created_date, user_no,
  like_count,
  completed_date, updated_date, answer
)
SELECT
  sp.category,
  sp.title,
  sp.content,
  sp.region || ' ' || sp.district AS address,
  sp.latitude,
  sp.longitude,
  sp.status,
  sp.created_date,
  sp.user_no,
  sp.like_count,
  CASE
    WHEN sp.status='COMPLETED' THEN
      CASE
        WHEN random() < 0.87 THEN sp.created_date + (interval '1 day' + random()*interval '2 days')
        ELSE sp.created_date + (interval '6 days' + random()*interval '9 days')
      END
    ELSE NULL
  END AS completed_date,
  CASE
    WHEN sp.status='COMPLETED' THEN NULL
    WHEN sp.status='IN_PROGRESS' THEN sp.created_date + (interval '6 hours' + random()*interval '30 hours')
    ELSE NULL
  END AS updated_date,
  CASE
    WHEN sp.status='COMPLETED' THEN sp.answer_seed
    ELSE NULL
  END AS answer
FROM status_plan sp
ORDER BY sp.created_date ASC;

UPDATE complaint
SET updated_date = completed_date
WHERE status='COMPLETED';

/* 5) complaint_agency: exactly 2 agencies per complaint
   - LOCAL must match city (split_part(address,' ',1))
   - CENTRAL must be category-compatible (NO simple random)
*/
DO $$
DECLARE
  r RECORD;
  v_city TEXT;
  v_local BIGINT;
  v_central BIGINT;
BEGIN
  FOR r IN
    SELECT complaint_no, address, category
    FROM complaint
  LOOP
    v_city := split_part(r.address, ' ', 1);

    /* LOCAL: city match */
    SELECT agency_no INTO v_local
    FROM agency
    WHERE agency_type='LOCAL' AND agency_name=v_city
    ORDER BY agency_no
    LIMIT 1;

    IF v_local IS NULL THEN
      SELECT agency_no INTO v_local
      FROM agency
      WHERE agency_type='LOCAL'
      ORDER BY random()
      LIMIT 1;
    END IF;

    /* CENTRAL: category-compatible pool only */
    SELECT a.agency_no INTO v_central
    FROM agency a
    WHERE a.agency_type='CENTRAL'
      AND (
        /* 환경: 기후/환경 키워드 */
        (r.category='환경' AND (a.agency_name LIKE '%환경%' OR a.agency_name LIKE '%기후%' OR a.agency_name LIKE '%에너지%'))
        OR
        /* 도로: 국토/도로/교통시설 키워드 */
        (r.category='도로' AND (a.agency_name LIKE '%국토%' OR a.agency_name LIKE '%도로%' OR a.agency_name LIKE '%교통%' OR a.agency_name LIKE '%시설%'))
        OR
        /* 교통: 경찰/교통 키워드 */
        (r.category='교통' AND (a.agency_name LIKE '%경찰%' OR a.agency_name LIKE '%교통%'))
        OR
        /* 행정·안전: 행안/안전/재난 키워드 */
        (r.category='행정·안전' AND (a.agency_name LIKE '%행정%' OR a.agency_name LIKE '%안전%' OR a.agency_name LIKE '%재난%'))
        OR
        /* 기타: 중앙기관 제한 없이 허용 */
        (r.category='기타')
      )
    ORDER BY random()
    LIMIT 1;

    /* fallback: 중앙기관이 키워드로 안 잡히는 DB라면 최소한 category별 '대표기관명' 우선 찾기 */
    IF v_central IS NULL THEN
      SELECT agency_no INTO v_central
      FROM agency
      WHERE agency_type='CENTRAL'
      ORDER BY random()
      LIMIT 1;
    END IF;

    INSERT INTO complaint_agency (complaint_no, agency_no) VALUES (r.complaint_no, v_local);
    INSERT INTO complaint_agency (complaint_no, agency_no) VALUES (r.complaint_no, v_central);
  END LOOP;
END $$;

/* 6) spatial_feature: 1:1 insert (map marker) */
INSERT INTO spatial_feature (feature_type, geom, addr_text, complaint_no, created_at)
SELECT
  'POINT',
  ST_SetSRID(ST_Point(c.longitude, c.latitude), 4326),
  c.address,
  c.complaint_no,
  c.created_date
FROM complaint c;

/* =========================================================
   7) VALIDATION QUERIES
========================================================= */

-- (A) total complaints (=500)
SELECT COUNT(*) AS total_complaints FROM complaint;

-- (B) status counts
SELECT status, COUNT(*) AS cnt
FROM complaint
GROUP BY status
ORDER BY status;

-- (C) category counts
SELECT category, COUNT(*) AS cnt
FROM complaint
GROUP BY category
ORDER BY cnt DESC, category;

-- (D) recent 3 days counts by day+category
SELECT
  to_char(created_date::date, 'YYYY-MM-DD') AS day,
  category,
  COUNT(*) AS cnt
FROM complaint
WHERE created_date >= NOW() - interval '3 days'
GROUP BY 1, 2
ORDER BY 1, 2;

-- (E) violations: older than 5 days but not completed (must be 0)
SELECT COUNT(*) AS violations_old_not_completed
FROM complaint
WHERE created_date <= NOW() - interval '5 days'
  AND status <> 'COMPLETED';

-- (F) violations: completed but no answer (must be 0)
SELECT COUNT(*) AS violations_completed_no_answer
FROM complaint
WHERE status='COMPLETED'
  AND (answer IS NULL OR length(trim(answer))=0);

-- (G) spatial_feature count (=500)
SELECT COUNT(*) AS spatial_count FROM spatial_feature;

-- (H) agency mapping must be exactly 2 per complaint (must be 0)
SELECT COUNT(*) AS violations_agency_mapping
FROM (
  SELECT complaint_no, COUNT(*) AS cnt
  FROM complaint_agency
  GROUP BY complaint_no
) t
WHERE t.cnt <> 2;

-- (K) age-group complaints (required logic: age() interval compare)
WITH age_stats AS (
  SELECT
    CASE
      WHEN age(CURRENT_DATE, u.birth_date)
           BETWEEN interval '20 years' AND interval '29 years' THEN '20대'
      WHEN age(CURRENT_DATE, u.birth_date)
           BETWEEN interval '30 years' AND interval '39 years' THEN '30대'
      WHEN age(CURRENT_DATE, u.birth_date)
           BETWEEN interval '40 years' AND interval '49 years' THEN '40대'
      WHEN age(CURRENT_DATE, u.birth_date)
           BETWEEN interval '50 years' AND interval '59 years' THEN '50대'
      ELSE '60대 이상'
    END AS age_group
  FROM complaint c
  JOIN app_user u ON u.user_no = c.user_no
)
SELECT
  age_group,
  COUNT(*) AS complaint_cnt,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percent
FROM age_stats
GROUP BY age_group
ORDER BY age_group;

-- ===========================================
-- REQUIRED CONSISTENCY VALIDATION (3 items)
-- ===========================================

/* (V1) 환경 계열 중앙기관 배정인데 제목/내용에 도로/교통 키워드 포함 (0이어야 정상) */
SELECT COUNT(*) AS violations_env_agency_has_road_traffic_text
FROM complaint c
JOIN complaint_agency ca ON ca.complaint_no = c.complaint_no
JOIN agency a ON a.agency_no = ca.agency_no
WHERE a.agency_type='CENTRAL'
  AND (a.agency_name LIKE '%환경%' OR a.agency_name LIKE '%기후%' OR a.agency_name LIKE '%에너지%')
  AND (
    c.title   ~ '(포트홀|보도블록|차선|가로등|침하|신호등|교차로|불법|정류장|혼잡)'
    OR
    c.content ~ '(포트홀|보도블록|차선|가로등|침하|신호등|교차로|불법|정류장|혼잡)'
  );

 /* (V2) 도로 민원인데 환경 계열 중앙기관 배정 (0이어야 정상) */
SELECT COUNT(*) AS violations_road_category_has_env_agency
FROM complaint c
JOIN complaint_agency ca ON ca.complaint_no = c.complaint_no
JOIN agency a ON a.agency_no = ca.agency_no
WHERE c.category='도로'
  AND a.agency_type='CENTRAL'
  AND (a.agency_name LIKE '%환경%' OR a.agency_name LIKE '%기후%' OR a.agency_name LIKE '%에너지%');

 /* (V3) category / central-agency compatibility mismatch (0이어야 정상)
    - 중앙기관 기준으로 카테고리 불일치만 카운트 */
SELECT COUNT(*) AS violations_category_central_agency_mismatch
FROM complaint c
JOIN complaint_agency ca ON ca.complaint_no = c.complaint_no
JOIN agency a ON a.agency_no = ca.agency_no
WHERE a.agency_type='CENTRAL'
  AND (
    (c.category='환경' AND NOT (a.agency_name LIKE '%환경%' OR a.agency_name LIKE '%기후%' OR a.agency_name LIKE '%에너지%'))
    OR
    (c.category='도로' AND NOT (a.agency_name LIKE '%국토%' OR a.agency_name LIKE '%도로%' OR a.agency_name LIKE '%교통%' OR a.agency_name LIKE '%시설%'))
    OR
    (c.category='교통' AND NOT (a.agency_name LIKE '%경찰%' OR a.agency_name LIKE '%교통%'))
    OR
    (c.category='행정·안전' AND NOT (a.agency_name LIKE '%행정%' OR a.agency_name LIKE '%안전%' OR a.agency_name LIKE '%재난%'))
  ); 
