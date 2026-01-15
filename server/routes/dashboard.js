import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// 1. 지역별/기관별 통계 (RegionStatsChart)
// type: 'region' | 'institution'
router.get('/region-stats', async (req, res) => {
    try {
        const { type } = req.query;

        if (type === 'institution') {
            const result = await query(`
                SELECT a.agency_name as name, COUNT(ca.complaint_no) as count
                FROM agency a
                LEFT JOIN complaint_agency ca ON a.agency_no = ca.agency_no
                WHERE a.agency_type = 'CENTRAL'
                GROUP BY a.agency_name
                ORDER BY count DESC
                LIMIT 5
            `);
            res.json(result.rows);
        } else {
            // Region (Address based or Agency Region Code based?)
            // Using Agency Region Code for now as it's cleaner if Complaints are assigned
            // OR parsing address from Complaint table.
            // Let's use Agency Region Code for mapped complaints.
            /*
            const result = await query(`
                SELECT 
                    CASE 
                        WHEN a.region_code = '11' THEN '서울'
                        WHEN a.region_code = '26' THEN '부산'
                        WHEN a.region_code = '41' THEN '경기'
                        WHEN a.region_code = '28' THEN '인천'
                        WHEN a.region_code = '48' THEN '경남'
                        ELSE '기타'
                    END as name,
                    COUNT(c.complaint_no) as count
                FROM complaint c
                JOIN complaint_agency ca ON c.complaint_no = ca.complaint_no
                JOIN agency a ON ca.agency_no = a.agency_no
                WHERE a.agency_type = 'LOCAL'
                GROUP BY name
                ORDER BY count DESC
                LIMIT 5
            `);
            */
            // Simpler approach: Group by first 2 chars of address in Complaint table?
            const result = await query(`
                SELECT 
                    SUBSTRING(address, 1, 2) as name,
                    COUNT(*) as count
                FROM complaint
                WHERE address IS NOT NULL
                GROUP BY SUBSTRING(address, 1, 2)
                ORDER BY count DESC
                LIMIT 5
           `);
            res.json(result.rows);
        }
    } catch (error) {
        console.error('[Dashboard] Region stats error:', error);
        res.status(500).json({ error: 'Failed to fetch region stats' });
    }
});

// 2. 병목 구간 (DistrictBottleneckChart)
// Top agencies with unprocessed complaints
router.get('/bottleneck', async (req, res) => {
    try {
        const result = await query(`
            SELECT a.agency_name as name, COUNT(*) as count
            FROM complaint_agency ca
            JOIN agency a ON ca.agency_no = a.agency_no
            WHERE ca.status IN ('RECEIVED', 'IN_PROGRESS')
            GROUP BY a.agency_name
            ORDER BY count DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('[Dashboard] Bottleneck error:', error);
        res.status(500).json({ error: 'Failed to fetch bottleneck stats' });
    }
});

// 3. 민원 추세 (ComplaintTrendChart)
// Last 7 days or 30 days
router.get('/trends', async (req, res) => {
    try {
        const result = await query(`
            SELECT TO_CHAR(created_date, 'YYYY-MM-DD') as date, COUNT(*) as count
            FROM complaint
            WHERE created_date > NOW() - INTERVAL '30 days'
            GROUP BY TO_CHAR(created_date, 'YYYY-MM-DD')
            ORDER BY date ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('[Dashboard] Trends error:', error);
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
});

// 4. 카테고리별 통계 (ComplaintCategoryChart)
router.get('/categories', async (req, res) => {
    try {
        const result = await query(`
            SELECT category, COUNT(*) as count
            FROM complaint
            GROUP BY category
            ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('[Dashboard] Categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// 5. 연령대별 통계 (AgeGroupChart)
router.get('/age-groups', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                FLOOR(EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) / 10) * 10 as age_group,
                COUNT(*) as count
            FROM app_user u
            JOIN complaint c ON u.user_no = c.user_no
            WHERE u.birth_date IS NOT NULL
            GROUP BY age_group
            ORDER BY age_group ASC
        `);
        // transform null age_group or map to '10대', '20대' etc in frontend or here.
        // Returning raw numbers for now.
        res.json(result.rows);
    } catch (error) {
        console.error('[Dashboard] Age groups error:', error);
        res.status(500).json({ error: 'Failed to fetch age groups' });
    }
});

export default router;
