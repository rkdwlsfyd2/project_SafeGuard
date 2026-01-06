import pg from 'pg';
const { Pool } = pg;

// PostgreSQL 연결 풀 설정
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/civil_complaint_db',
});

// 연결 테스트
pool.on('connect', () => {
    console.log('[DB] PostgreSQL 연결 성공');
});

pool.on('error', (err) => {
    console.error('[DB] PostgreSQL 연결 오류:', err);
});

// 쿼리 실행 헬퍼 함수
export const query = (text, params) => pool.query(text, params);

// 트랜잭션 헬퍼
export const getClient = () => pool.connect();

export default pool;
