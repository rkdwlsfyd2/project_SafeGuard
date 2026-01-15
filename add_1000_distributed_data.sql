-- 1,000개의 추가 데이터를 생성하여 최근 5년~현재까지 고르게 분산시키고
-- 월별/일별 트렌드를 완벽하게 지원하도록 하는 스크립트

DO $$
DECLARE
    i INT;
    target_date TIMESTAMP;
    is_sla_compliant BOOLEAN;
    complaint_id INT;
    user_ids INT[];
    agency_ids INT[];
    categories TEXT[] := ARRAY['도로', '행정·안전', '교통', '주택·건축', '환경'];
    districts TEXT[] := ARRAY['강남구', '서초구', '송파구', '마포구', '용산구', '성동구', '영등포구', '강서구', '양천구', '종로구'];
    selected_district TEXT;
BEGIN
    -- 랜덤 선택을 위한 사용자 및 기관 ID 목록 가져오기
    SELECT array_agg(user_no) INTO user_ids FROM app_user WHERE role = 'USER';
    -- agency_name 컬럼 확인됨
    SELECT array_agg(agency_no) INTO agency_ids FROM agency WHERE agency_name LIKE '%구청%';

    -- 1,000건 루프 생성
    FOR i IN 1..1000 LOOP
        -- 1. 날짜 결정: 최근 4년 내 랜덤 (과거 데이터 ~ 현재까지)
        target_date := CURRENT_TIMESTAMP - (random() * interval '4 years');
        
        -- 2. SLA 준수 여부 결정 (약 87% 확률)
        is_sla_compliant := random() < 0.87;
        
        selected_district := districts[floor(random() * array_length(districts, 1)) + 1];

        -- 3. 민원 삽입
        INSERT INTO complaint (
            category, title, content, status, is_public, user_no, 
            created_date, address, latitude, longitude
        ) VALUES (
            categories[floor(random() * array_length(categories, 1)) + 1],
            '추가 데이터 민원 #' || (2000 + i),
            '시간별 트렌드 분석을 위한 자동 생성 데이터입니다.',
            'COMPLETED',
            true,
            user_ids[floor(random() * array_length(user_ids, 1)) + 1],
            target_date,
            '서울특별시 ' || selected_district || ' 어느 길',
            37.5 + (random() * 0.1),
            126.9 + (random() * 0.1)
        ) RETURNING complaint_no INTO complaint_id;

        -- 4. 처리 날짜(SLA) 및 완료 상태 업데이트
        IF is_sla_compliant THEN
            UPDATE complaint 
            SET completed_date = target_date + (random() * interval '2 days'),
                updated_date = target_date + (random() * interval '2 days')
            WHERE complaint_no = complaint_id;
        ELSE
            UPDATE complaint 
            SET completed_date = target_date + (interval '5 days' + random() * interval '10 days'),
                updated_date = target_date + (interval '5 days' + random() * interval '10 days')
            WHERE complaint_no = complaint_id;
        END IF;

        -- 5. 기관 매핑 (자치구)
        -- agency_ids가 비어있을 경우 고정값이나 예외 처리
        IF array_length(agency_ids, 1) > 0 THEN
            INSERT INTO complaint_agency (complaint_no, agency_no)
            VALUES (complaint_id, agency_ids[floor(random() * array_length(agency_ids, 1)) + 1]);
        END IF;
        
    END LOOP;

    RAISE NOTICE '1,000개의 추가 데이터 생성 완료.';
END $$;
