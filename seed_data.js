import http from 'http';

const BASE_URL = 'http://localhost:5000/api';

function request(endpoint, method, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 400) {
                        // resolve(null); 
                        console.error(`Error ${res.statusCode}: ${body}`);
                        resolve(null);
                    } else {
                        resolve(JSON.parse(body));
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Request error: ${e.message}`);
            resolve(null);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function main() {
    console.log("🔑 로그인/회원가입 시도 중...");

    // Using random email to avoid duplicate key error on re-run
    const randomId = Math.floor(Math.random() * 10000);
    const userCred = {
        email: `dummy_${randomId}@test.com`,
        password: "password123",
        name: "더미유저",
        phone: "010-1234-5678"
    };

    // Try verifying typical test user first
    const fixedUser = { email: "test@test.com", password: "password123", name: "테스트유저", phone: "010-0000-0000" };
    let loginRes = await request('/auth/login', 'POST', { email: fixedUser.email, password: fixedUser.password });

    if (!loginRes) {
        console.log("✨ 테스트 유저 가입 진행...");
        await request('/auth/register', 'POST', fixedUser);
        loginRes = await request('/auth/login', 'POST', { email: fixedUser.email, password: fixedUser.password });
    }

    // If fixed user fails (maybe manual deletion), try random
    if (!loginRes) {
        console.log("✨ 랜덤 유저 가입 진행...");
        await request('/auth/register', 'POST', userCred);
        loginRes = await request('/auth/login', 'POST', { email: userCred.email, password: userCred.password });
    }

    if (!loginRes || !loginRes.accessToken) {
        console.error("❌ 로그인 실패 (토큰 없음)");
        return;
    }

    const token = loginRes.accessToken;
    console.log("✅ 로그인 성공! (Token 확보)");

    const categories = ["도로/시설물", "불법주차", "환경오염", "기타", "안전신문고"];
    const titles = [
        "도로 파손 신고합니다", "신호등이 고장났어요", "횡단보도 페인트가 지워졌어요",
        "가로등이 깜빡거립니다", "불법 주차 차량 신고", "쓰레기 무단 투기 목격",
        "보도블럭 교체 요청", "공원 벤치 파손", "소음 민원입니다", "안전 펜스 설치 요청",
        "맨홀 뚜껑 열림", "가로수 가지치기 요청", "불법 현수막 철거 요청"
    ];
    const contents = [
        "빠른 조치 부탁드립니다.", "위험해 보입니다. 확인해주세요.",
        "오랫동안 방치되어 있습니다.", "지나가다가 발견해서 신고합니다.",
        "아이들이 다니는 길이라 위험합니다.", "정확한 위치는 지도에 표시했습니다.",
        "비가 오면 물이 고입니다.", "악취가 납니다."
    ];

    console.log("🚀 80개 더미 데이터 생성 시작...");

    for (let i = 0; i < 80; i++) {
        const data = {
            title: `${titles[Math.floor(Math.random() * titles.length)]}`,
            description: `${contents[Math.floor(Math.random() * contents.length)]} (자동 생성된 민원 #${i + 1})`,
            category: categories[Math.floor(Math.random() * categories.length)],
            address: "서울시 강남구 테헤란로 123",
            latitude: 37.5000 + (Math.random() * 0.01),
            longitude: 127.0300 + (Math.random() * 0.01),
            // Dummy image path (must be relative or absolute path handled by backend?)
            // Backend probably expects just a string.
            imagePath: "/uploads/dummy.jpg",
            analysisResult: JSON.stringify({ label: "Dummy", confidence: 0.99 }),
            status: "PENDING"
        };

        // Randomize Status slightly
        if (i % 5 === 0) data.status = "IN_PROGRESS";
        if (i % 10 === 0) data.status = "COMPLETED";

        // Use the seed endpoint which bypasses auth check but looks up user internally
        const res = await request('/seed/complaints', 'POST', data); // No token needed for this open endpoint
        if (res) {
            console.log(`[${i + 1}/80] ✅ 접수 완료: ${data.title}`);
        } else {
            console.log(`[${i + 1}/80] ❌ 실패`);
        }

        // Small delay
        await new Promise(r => setTimeout(r, 20)); // Faster
    }

    console.log("\n🎉 모든 데이터 생성 완료!");
}

main();
