DO $$
DECLARE
  r RECORD;
  v_local BIGINT;
  v_central BIGINT;
BEGIN
  -- 10일 이내 생성되었으나 기관 매핑이 없는 민원 대상
  FOR r IN
    SELECT c.complaint_no, c.address, c.category
    FROM complaint c
    LEFT JOIN complaint_agency ca ON c.complaint_no = ca.complaint_no
    WHERE c.created_date > NOW() - interval '10 days'
      AND ca.agency_no IS NULL
  LOOP
    -- LOCAL Assignment
    SELECT agency_no INTO v_local FROM agency WHERE agency_type='LOCAL' AND agency_name=split_part(r.address, ' ', 1) LIMIT 1;
    IF v_local IS NULL THEN
        SELECT agency_no INTO v_local FROM agency WHERE agency_type='LOCAL' ORDER BY random() LIMIT 1;
    END IF;

    -- CENTRAL Assignment
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

    -- Insert safely
    INSERT INTO complaint_agency (complaint_no, agency_no) VALUES (r.complaint_no, v_local) ON CONFLICT DO NOTHING;
    INSERT INTO complaint_agency (complaint_no, agency_no) VALUES (r.complaint_no, v_central) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
