-- 2,000명의 대규모 유저 데이터 생성 스크립트
-- PostgreSQL의 generate_series와 random()을 사용하여 효율적으로 생성합니다.

DO $$
DECLARE
    last_names text[] := ARRAY['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
    first_names text[] := ARRAY['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서', '서윤', '서연', '지우', '하윤', '민서', '하은', '지유', '윤서', '지아', '나은'];
    addresses text[] := ARRAY['서울특별시 강남구', '서울특별시 서초구', '서울특별시 송파구', '서울특별시 강서구', '서울특별시 마포구', '서울특별시 영등포구', '서울특별시 성동구', '서울특별시 종로구', '경기도 수원시', '경기도 성남시', '인천광역시 중구', '부산광역시 해운대구', '대구광역시 수성구', '대전광역시 유성구', '광주광역시 북구'];
BEGIN
    INSERT INTO app_user (user_id, pw, name, birth_date, addr, phone, role)
    SELECT 
        'user' || i AS user_id,
        -- 모든 유저에게 동일한 해시된 비밀번호 부여 (테스트 편의성)
        '$2b$10$Ooc3cQIUzbXrux1X6AoN7e7g1Uf7TdGxPEo/SNPkTuo5IgPhoyh3u' AS pw,
        last_names[floor(random() * 20 + 1)] || first_names[floor(random() * 20 + 1)] AS name,
        (CURRENT_DATE - (interval '15 years' + random() * interval '50 years'))::date AS birth_date,
        addresses[floor(random() * 15 + 1)] || ' ' || floor(random() * 1000 + 1) || '번지' AS addr,
        '010-' || LPAD(floor(random() * 10000)::text, 4, '0') || '-' || LPAD(floor(random() * 10000)::text, 4, '0') AS phone,
        'USER' AS role
    FROM generate_series(1, 2000) AS i
    ON CONFLICT (user_id) DO NOTHING;
END $$;

-- 생성 결과 확인
SELECT COUNT(*) AS total_users FROM app_user;
