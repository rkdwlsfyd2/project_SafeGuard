import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
};

// 민원 목록 조회 (공개 + 본인 비공개)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, category } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE (c.is_public = true';
        const params = [];
        let paramIndex = 1;

        // 로그인한 경우 본인 비공개 민원도 포함
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                whereClause += ` OR c.user_no = $${paramIndex}`;
                params.push(decoded.userNo);
                paramIndex++;
            } catch (e) { /* 무시 */ }
        }
        whereClause += ')';

        // 필터 조건
        if (status) {
            whereClause += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (category) {
            whereClause += ` AND c.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        // 총 개수
        const countResult = await query(
            `SELECT COUNT(*) FROM complaint c ${whereClause}`,
            params
        );
        const totalCount = parseInt(countResult.rows[0].count);

        // 목록 조회
        params.push(limit, offset);
        const result = await query(
            `SELECT c.complaint_no, c.category, c.title, c.status, c.is_public, c.created_date,
                    u.name as author_name,
                    (SELECT COUNT(*) FROM post_like WHERE complaint_no = c.complaint_no) as like_count,
                    (SELECT COUNT(*) FROM complaint_reply WHERE complaint_no = c.complaint_no) as reply_count
             FROM complaint c
             JOIN app_user u ON c.user_no = u.user_no
             ${whereClause}
             ORDER BY c.created_date DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        res.json({
            complaints: result.rows.map(row => ({
                complaintNo: row.complaint_no,
                category: row.category,
                title: row.title,
                status: row.status,
                isPublic: row.is_public,
                createdDate: row.created_date,
                authorName: row.author_name,
                likeCount: parseInt(row.like_count),
                replyCount: parseInt(row.reply_count)
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('[Complaints] 목록 조회 오류:', error);
        res.status(500).json({ error: '민원 목록을 불러오지 못했습니다.' });
    }
});

// 민원 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT c.*, u.name as author_name, u.user_id as author_id,
                    sf.feature_type, sf.addr_text, ST_AsGeoJSON(sf.geom) as geom_json
             FROM complaint c
             JOIN app_user u ON c.user_no = u.user_no
             LEFT JOIN spatial_feature sf ON c.complaint_no = sf.complaint_no
             WHERE c.complaint_no = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '민원을 찾을 수 없습니다.' });
        }

        const complaint = result.rows[0];

        // 비공개 민원 권한 체크
        if (!complaint.is_public) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(403).json({ error: '비공개 민원입니다.' });
            }
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded.userNo !== complaint.user_no && decoded.role === 'USER') {
                    return res.status(403).json({ error: '비공개 민원입니다.' });
                }
            } catch (e) {
                return res.status(403).json({ error: '비공개 민원입니다.' });
            }
        }

        // 첨부파일 조회
        const filesResult = await query(
            'SELECT file_no, file_url, file_type, uploaded_date FROM complaint_file WHERE complaint_no = $1',
            [id]
        );

        // 답변 조회
        const repliesResult = await query(
            `SELECT cr.reply_no, cr.content, cr.created_at, u.name as author_name, u.role
             FROM complaint_reply cr
             JOIN app_user u ON cr.user_no = u.user_no
             WHERE cr.complaint_no = $1
             ORDER BY cr.created_at ASC`,
            [id]
        );

        // 배정 기관 조회
        const agenciesResult = await query(
            `SELECT ca.status, ca.assigned_at, ca.memo, a.agency_name, a.agency_type
             FROM complaint_agency ca
             JOIN agency a ON ca.agency_no = a.agency_no
             WHERE ca.complaint_no = $1`,
            [id]
        );

        res.json({
            complaintNo: complaint.complaint_no,
            category: complaint.category,
            title: complaint.title,
            content: complaint.content,
            status: complaint.status,
            isPublic: complaint.is_public,
            createdDate: complaint.created_date,
            updatedDate: complaint.updated_date,
            completedDate: complaint.completed_date,
            author: {
                name: complaint.author_name,
                userId: complaint.author_id
            },
            location: complaint.addr_text ? {
                address: complaint.addr_text,
                featureType: complaint.feature_type,
                geometry: complaint.geom_json ? JSON.parse(complaint.geom_json) : null
            } : null,
            files: filesResult.rows,
            replies: repliesResult.rows.map(r => ({
                replyNo: r.reply_no,
                content: r.content,
                createdAt: r.created_at,
                authorName: r.author_name,
                authorRole: r.role
            })),
            agencies: agenciesResult.rows.map(a => ({
                agencyName: a.agency_name,
                agencyType: a.agency_type,
                status: a.status,
                assignedAt: a.assigned_at,
                memo: a.memo
            }))
        });
    } catch (error) {
        console.error('[Complaints] 상세 조회 오류:', error);
        res.status(500).json({ error: '민원 상세 정보를 불러오지 못했습니다.' });
    }
});

// 민원 등록 (인증 필요)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { category, title, content, isPublic = true, location } = req.body;
        const userNo = req.user.userNo;

        if (!category || !title || !content) {
            return res.status(400).json({ error: '분류, 제목, 내용을 모두 입력해주세요.' });
        }

        // 민원 등록
        const result = await query(
            `INSERT INTO complaint (category, title, content, is_public, user_no)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING complaint_no, created_date`,
            [category, title, content, isPublic, userNo]
        );

        const complaintNo = result.rows[0].complaint_no;

        // 위치 정보가 있으면 저장
        if (location && location.lat && location.lng) {
            await query(
                `INSERT INTO spatial_feature (feature_type, geom, addr_text, complaint_no)
                 VALUES ('POINT', ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, $4)`,
                [location.lng, location.lat, location.address || '', complaintNo]
            );
        }

        console.log(`[Complaints] 민원 등록: #${complaintNo} by user ${userNo}`);

        res.status(201).json({
            message: '민원이 접수되었습니다.',
            complaintNo,
            createdDate: result.rows[0].created_date
        });
    } catch (error) {
        console.error('[Complaints] 등록 오류:', error);
        res.status(500).json({ error: '민원 등록 중 오류가 발생했습니다.' });
    }
});

// 민원 수정 (본인만)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, isPublic } = req.body;
        const userNo = req.user.userNo;

        // 권한 확인
        const checkResult = await query(
            'SELECT user_no, status FROM complaint WHERE complaint_no = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: '민원을 찾을 수 없습니다.' });
        }

        if (checkResult.rows[0].user_no !== userNo) {
            return res.status(403).json({ error: '수정 권한이 없습니다.' });
        }

        if (checkResult.rows[0].status !== 'RECEIVED') {
            return res.status(400).json({ error: '처리 중인 민원은 수정할 수 없습니다.' });
        }

        await query(
            `UPDATE complaint SET title = COALESCE($1, title), content = COALESCE($2, content), 
             is_public = COALESCE($3, is_public), updated_date = CURRENT_TIMESTAMP
             WHERE complaint_no = $4`,
            [title, content, isPublic, id]
        );

        res.json({ message: '민원이 수정되었습니다.' });
    } catch (error) {
        console.error('[Complaints] 수정 오류:', error);
        res.status(500).json({ error: '민원 수정 중 오류가 발생했습니다.' });
    }
});

// 민원 삭제 (본인만, 접수 상태만)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userNo = req.user.userNo;

        const checkResult = await query(
            'SELECT user_no, status FROM complaint WHERE complaint_no = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: '민원을 찾을 수 없습니다.' });
        }

        if (checkResult.rows[0].user_no !== userNo && req.user.role === 'USER') {
            return res.status(403).json({ error: '삭제 권한이 없습니다.' });
        }

        if (checkResult.rows[0].status !== 'RECEIVED') {
            return res.status(400).json({ error: '처리 중인 민원은 삭제할 수 없습니다.' });
        }

        await query('DELETE FROM complaint WHERE complaint_no = $1', [id]);

        res.json({ message: '민원이 삭제되었습니다.' });
    } catch (error) {
        console.error('[Complaints] 삭제 오류:', error);
        res.status(500).json({ error: '민원 삭제 중 오류가 발생했습니다.' });
    }
});

// 좋아요 토글
router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userNo = req.user.userNo;

        // 기존 좋아요 확인
        const existing = await query(
            'SELECT like_id FROM post_like WHERE complaint_no = $1 AND user_no = $2',
            [id, userNo]
        );

        if (existing.rows.length > 0) {
            // 좋아요 취소
            await query('DELETE FROM post_like WHERE complaint_no = $1 AND user_no = $2', [id, userNo]);
            res.json({ liked: false, message: '좋아요가 취소되었습니다.' });
        } else {
            // 좋아요 추가
            await query('INSERT INTO post_like (complaint_no, user_no) VALUES ($1, $2)', [id, userNo]);
            res.json({ liked: true, message: '좋아요를 눌렀습니다.' });
        }
    } catch (error) {
        console.error('[Complaints] 좋아요 오류:', error);
        res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
    }
});

// 지도용 민원 위치 목록
router.get('/map/locations', async (req, res) => {
    try {
        const result = await query(
            `SELECT c.complaint_no, c.category, c.title, c.status,
                    sf.addr_text, ST_X(sf.geom) as lng, ST_Y(sf.geom) as lat
             FROM complaint c
             JOIN spatial_feature sf ON c.complaint_no = sf.complaint_no
             WHERE c.is_public = true AND sf.feature_type = 'POINT'
             ORDER BY c.created_date DESC
             LIMIT 1000`
        );

        res.json(result.rows.map(row => ({
            complaintNo: row.complaint_no,
            category: row.category,
            title: row.title,
            status: row.status,
            address: row.addr_text,
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng)
        })));
    } catch (error) {
        console.error('[Complaints] 지도 위치 조회 오류:', error);
        res.status(500).json({ error: '위치 정보를 불러오지 못했습니다.' });
    }
});

export default router;
