import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/auth.js';
import complaintsRoutes from './routes/complaints.js';
import agenciesRoutes from './routes/agencies.js';
import dashboardRoutes from './routes/dashboard.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// uploads 폴더 생성
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// 민원 목록 API (더미 데이터)
app.get('/api/reports', (req, res) => {
    res.json([
        { id: 1, title: '도로 파손 신고', region: '서울시 강남구', date: '2025-12-30', interested: 5 },
        { id: 2, title: '불법 주차 차량', region: '경기도 성남시', date: '2025-12-31', interested: 3 }
    ]);
});
// 정적 파일 서빙 (업로드된 이미지)
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/agencies', agenciesRoutes);
app.use('/api/dashboard', dashboardRoutes);


// 이미지 분석 API (기존 유지)
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '이미지가 업로드되지 않았습니다.' });
    }

    const imagePath = req.file.path;
    console.log(`[서버 로그] 이미지 수신 완료: ${imagePath}`);
    console.log(`[서버 로그] AI 분석 프로세스를 시작합니다...`);

    // Python 실행 명령 확인 (Windows에서는 'py', 그 외에는 'python'을 주로 사용)
    const pythonCmd = process.platform === 'win32' ? 'py' : 'python';
    const pythonProcess = spawn(pythonCmd, [path.join(__dirname, 'analyze_image.py'), imagePath]);

    let resultData = '';
    let errorLog = '';

    pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        errorLog += output;
        // 한글 로그는 서버 터미널에 출력
        process.stdout.write(output);
    });

    pythonProcess.on('close', async (code) => {
        console.log(`[서버 로그] AI 분석 프로세스 종료 (코드: ${code})`);

        if (code !== 0) {
            console.error(`[서버 로그] AI 프로세스 비정상 종료. 에러: ${errorLog}`);
            return res.status(500).json({ error: 'AI 분석 프로세스가 비정상 종료되었습니다.', details: errorLog });
        }

        try {
            // 결과 데이터에서 JSON만 추출 (혹시 모를 다른 로그가 섞여있을 수 있음)
            const jsonMatch = resultData.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('결과 데이터에서 JSON 형식을 찾을 수 없습니다.');
            }
            const jsonString = jsonMatch[0];
            const resultJson = JSON.parse(jsonString);

            console.log(`[서버 로그] 분석 성공: ${jsonString}`);

            res.json({
                ...resultJson,
                imagePath: `/uploads/${path.basename(imagePath)}`,
                message: '분석 완료'
            });

        } catch (e) {
            console.error(`[서버 로그] 결과 처리 중 오류: ${e.message}`);
            res.status(500).json({ error: '결과 처리 중 오류가 발생했습니다.' });
        }
    });
});

// 헬스 체크
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error('[서버 에러]', err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`[서버 로그] 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`[서버 로그] http://localhost:${PORT}`);
    console.log(`[서버 로그] API 엔드포인트:`);
    console.log(`  - POST /api/auth/register`);
    console.log(`  - POST /api/auth/login`);
    console.log(`  - GET  /api/auth/me`);
    console.log(`  - GET  /api/complaints`);
    console.log(`  - POST /api/complaints`);
    console.log(`  - GET  /api/complaints/:id`);
    console.log(`  - GET  /api/agencies`);
    console.log(`  - POST /api/analyze-image`);
});
