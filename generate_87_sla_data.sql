-- 기존 데이터를 활용하여 최근 6개월간 날짜를 분산시키고, 
-- 월별 SLA 준수율을 약 87% 내외로 조정하는 스크립트

DO $$
DECLARE
    months_ago INT;
    total_completed INT;
    target_sla_per_month INT;
    rec RECORD;
    month_start TIMESTAMP;
    complaint_ids INT[];
    month_complaint_count INT;
    i INT;
    sla_count_for_this_month INT;
    target_date TIMESTAMP;
BEGIN
    -- 1. 완료된 전체 민원 ID 목록 가져오기
    SELECT array_agg(complaint_no ORDER BY random()) INTO complaint_ids 
    FROM complaint WHERE status = 'COMPLETED';
    
    total_completed := array_length(complaint_ids, 1);
    
    IF total_completed IS NULL OR total_completed = 0 THEN
        RAISE NOTICE '완료된 민원이 없습니다.';
        RETURN;
    END IF;

    -- 2. 최근 6개월(0~5개월 전)에 대해 데이터 분산
    -- 각 월별로 대략 동일한 수의 데이터 배분
    month_complaint_count := total_completed / 6;

    FOR months_ago IN 0..5 LOOP
        month_start := date_trunc('month', CURRENT_TIMESTAMP - (months_ago || ' months')::interval);
        sla_count_for_this_month := ROUND(month_complaint_count * 0.87);
        
        RAISE NOTICE '%월 데이터 처리 중... (총 %건, 목표 SLA %건)', 
            TO_CHAR(month_start, 'YYYY-MM'), month_complaint_count, sla_count_for_this_month;

        FOR i IN 1..month_complaint_count LOOP
            -- 처리할 민원 ID 인덱스 계산
            DECLARE
                idx INT := (months_ago * month_complaint_count) + i;
                curr_id INT;
            BEGIN
                IF idx > total_completed THEN EXIT; END IF;
                curr_id := complaint_ids[idx];

                -- 해당 월 내 랜덤 날짜 생성 (1~20일 사이 접수 가정)
                target_date := month_start + (random() * interval '20 days');

                IF i <= sla_count_for_this_month THEN
                    -- SLA 준수 (1~2일 내 완료)
                    UPDATE complaint 
                    SET created_date = target_date,
                        completed_date = target_date + (random() * interval '2 days'),
                        updated_date = target_date + (random() * interval '2 days')
                    WHERE complaint_no = curr_id;
                ELSE
                    -- SLA 미준수 (5~15일 소요)
                    UPDATE complaint 
                    SET created_date = target_date,
                        completed_date = target_date + (interval '5 days' + random() * interval '10 days'),
                        updated_date = target_date + (interval '5 days' + random() * interval '10 days')
                    WHERE complaint_no = curr_id;
                END IF;
            END;
        END LOOP;
    END LOOP;
END $$;

-- 결과 확인: 월별 SLA 준수율 집계
SELECT 
    TO_CHAR(completed_date, 'YYYY-MM') AS month,
    COUNT(*) as total_completed,
    COUNT(*) FILTER (WHERE (
        SELECT count(*) 
        FROM generate_series(created_date::date + 1, updated_date::date, '1 day') AS d 
        WHERE extract(dow from d) NOT IN (0, 6)
    ) <= 3) as compliant_count,
    ROUND(COUNT(*) FILTER (WHERE (
        SELECT count(*) 
        FROM generate_series(created_date::date + 1, updated_date::date, '1 day') AS d 
        WHERE extract(dow from d) NOT IN (0, 6)
    ) <= 3)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as sla_percent
FROM complaint 
WHERE status = 'COMPLETED'
GROUP BY 1
ORDER BY 1;
