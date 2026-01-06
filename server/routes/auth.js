import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = '7d';

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { userId, password, name, birthDate, addr, phone } = req.body;

        // 필수 필드 검증
        if (!userId || !password || !name || !birthDate || !addr || !phone) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }

        // 중복 체크
        const existingUser = await query('SELECT user_no FROM app_user WHERE user_id = $1', [userId]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        const result = await query(
            `INSERT INTO app_user (user_id, pw, name, birth_date, addr, phone, role)
             VALUES ($1, $2, $3, $4, $5, $6, 'USER')
             RETURNING user_no, user_id, name, role, created_date`,
            [userId, hashedPassword, name, birthDate, addr, phone]
        );

        const user = result.rows[0];
        console.log(`[Auth] 회원가입 성공: ${userId}`);

        res.status(201).json({
            message: '회원가입이 완료되었습니다.',
            user: {
                userNo: user.user_no,
                userId: user.user_id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[Auth] 회원가입 오류:', error);
        res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
        }

        // 사용자 조회
        const result = await query(
            'SELECT user_no, user_id, pw, name, role, agency_no FROM app_user WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        const user = result.rows[0];

        // 비밀번호 확인
        const isValidPassword = await bcrypt.compare(password, user.pw);
        if (!isValidPassword) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            {
                userNo: user.user_no,
                userId: user.user_id,
                role: user.role,
                agencyNo: user.agency_no
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`[Auth] 로그인 성공: ${userId}`);

        res.json({
            message: '로그인 성공',
            token,
            user: {
                userNo: user.user_no,
                userId: user.user_id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[Auth] 로그인 오류:', error);
        res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
});

// 현재 사용자 정보 조회
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const result = await query(
            `SELECT u.user_no, u.user_id, u.name, u.birth_date, u.addr, u.phone, u.role, u.created_date, 
                    a.agency_name
             FROM app_user u
             LEFT JOIN agency a ON u.agency_no = a.agency_no
             WHERE u.user_no = $1`,
            [decoded.userNo]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = result.rows[0];
        res.json({
            userNo: user.user_no,
            userId: user.user_id,
            name: user.name,
            birthDate: user.birth_date,
            addr: user.addr,
            phone: user.phone,
            role: user.role,
            createdDate: user.created_date,
            agencyName: user.agency_name
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '토큰이 만료되었습니다.' });
        }
        console.error('[Auth] 사용자 조회 오류:', error);
        res.status(500).json({ error: '사용자 정보 조회 중 오류가 발생했습니다.' });
    }
});

export default router;
