-- [추가] 공간 정보(spatial_feature) 더미 데이터 생성 스크립트
-- complaint 테이블에 이미 존재하는 위도(latitude), 경도(longitude) 데이터를 기반으로
-- spatial_feature 테이블에 PostGIS POINT 지오메트리 데이터를 삽입합니다.

INSERT INTO spatial_feature (feature_type, geom, addr_text, complaint_no, created_at)
SELECT 
    'POINT' as feature_type,
    ST_SetSRID(ST_Point(longitude, latitude), 4326) as geom,
    address as addr_text,
    complaint_no,
    created_date as created_at
FROM complaint c
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM spatial_feature sf WHERE sf.complaint_no = c.complaint_no
  );

-- 결과 확인
DO $$
BEGIN
    RAISE NOTICE '공간 정보 데이터 생성 완료';
END $$;

SELECT 
    (SELECT COUNT(*) FROM complaint) as total_complaints,
    (SELECT COUNT(*) FROM spatial_feature) as total_spatial_features;
