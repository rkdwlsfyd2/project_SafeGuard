import pg from 'pg';
const { Pool } = pg;
console.log("Script started...");

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'safeguard_db',
    password: '1234',
    port: 5432,
});

async function initDB() {
    const client = await pool.connect();
    try {
        console.log("🚀 데이터베이스 초기화(테이블 생성) 시작...");

        await client.query('BEGIN');

        // Create app_user table
        await client.query(`
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
    `);
        console.log("✅ app_user 테이블 확인/생성 완료");

        // Create complaint table
        await client.query(`
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
    `);
        console.log("✅ complaint 테이블 확인/생성 완료");

        await client.query('COMMIT');
        console.log("🎉 모든 테이블 초기화 완료!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ 초기화 실패:", e);
    } finally {
        client.release();
        pool.end();
    }
}

initDB();
