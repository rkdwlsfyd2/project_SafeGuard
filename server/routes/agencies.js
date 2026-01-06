import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// 기관 목록 조회
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;

        let sql = 'SELECT agency_no, agency_type, agency_name, region_code FROM agency';
        const params = [];

        if (type) {
            sql += ' WHERE agency_type = $1';
            params.push(type);
        }

        sql += ' ORDER BY agency_name';

        const result = await query(sql, params);

        res.json(result.rows.map(row => ({
            agencyNo: row.agency_no,
            agencyType: row.agency_type,
            agencyName: row.agency_name,
            regionCode: row.region_code
        })));
    } catch (error) {
        console.error('[Agencies] 목록 조회 오류:', error);
        res.status(500).json({ error: '기관 목록을 불러오지 못했습니다.' });
    }
});

// 기관 상세 정보
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT agency_no, agency_type, agency_name, region_code, created_at FROM agency WHERE agency_no = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '기관을 찾을 수 없습니다.' });
        }

        const agency = result.rows[0];

        // 해당 기관 민원 통계
        const statsResult = await query(
            `SELECT status, COUNT(*) as count 
             FROM complaint_agency WHERE agency_no = $1 
             GROUP BY status`,
            [id]
        );

        res.json({
            agencyNo: agency.agency_no,
            agencyType: agency.agency_type,
            agencyName: agency.agency_name,
            regionCode: agency.region_code,
            createdAt: agency.created_at,
            stats: statsResult.rows.reduce((acc, row) => {
                acc[row.status] = parseInt(row.count);
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('[Agencies] 상세 조회 오류:', error);
        res.status(500).json({ error: '기관 정보를 불러오지 못했습니다.' });
    }
});

// 기관별 민원 목록
router.get('/:id/complaints', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE ca.agency_no = $1';
        const params = [id];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND ca.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // 총 개수
        const countResult = await query(
            `SELECT COUNT(*) FROM complaint_agency ca ${whereClause}`,
            params
        );
        const totalCount = parseInt(countResult.rows[0].count);

        // 목록 조회
        params.push(limit, offset);
        const result = await query(
            `SELECT c.complaint_no, c.category, c.title, c.created_date,
                    ca.status as agency_status, ca.assigned_at, ca.memo,
                    u.name as author_name
             FROM complaint_agency ca
             JOIN complaint c ON ca.complaint_no = c.complaint_no
             JOIN app_user u ON c.user_no = u.user_no
             ${whereClause}
             ORDER BY ca.assigned_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        res.json({
            complaints: result.rows.map(row => ({
                complaintNo: row.complaint_no,
                category: row.category,
                title: row.title,
                createdDate: row.created_date,
                agencyStatus: row.agency_status,
                assignedAt: row.assigned_at,
                memo: row.memo,
                authorName: row.author_name
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('[Agencies] 민원 목록 조회 오류:', error);
        res.status(500).json({ error: '민원 목록을 불러오지 못했습니다.' });
    }
});

export default router;
