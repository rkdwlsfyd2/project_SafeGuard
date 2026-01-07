CREATE TABLE IF NOT EXISTS app_user (
    user_no SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    pw VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50),
    phone VARCHAR(20),
    addr VARCHAR(255),
    birth_date DATE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    agency_no BIGINT
);

CREATE TABLE IF NOT EXISTS complaint (
    complaint_no SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(100),
    address VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    image_path VARCHAR(500),
    analysis_result JSONB,
    status VARCHAR(50) DEFAULT 'PENDING',
    is_public BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    user_no BIGINT REFERENCES app_user(user_no)
);
