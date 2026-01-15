package com.safeguard.controller;

import com.safeguard.dto.ComplaintDTO;
import com.safeguard.dto.SeedRequest;
import com.safeguard.dto.UserDTO;
import com.safeguard.entity.Agency;
import com.safeguard.mapper.ComplaintMapper;
import com.safeguard.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.ArrayList;
import java.time.format.DateTimeFormatter;

@Slf4j
@RestController
@RequestMapping("/api/seed")
@RequiredArgsConstructor
public class SeedController {

    private final ComplaintMapper complaintMapper;
    private final UserMapper userMapper;
    private final com.safeguard.mapper.AgencyMapper agencyMapper;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @PostMapping("/migrate-schema")
    public ResponseEntity<Map<String, String>> migrateSchema() {
        try {
            log.info("[Seed] Starting schema migration (Full DDL)...");

            // 1. Create Agency Table
            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS agency (
                            agency_no BIGSERIAL PRIMARY KEY,
                            agency_type VARCHAR(20) NOT NULL,
                            agency_name VARCHAR(200) NOT NULL,
                            region_code VARCHAR(20),
                            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                        )
                    """);

            // 2. Create AppUser Table
            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS app_user (
                            user_no BIGSERIAL PRIMARY KEY,
                            user_id VARCHAR(50) UNIQUE NOT NULL,
                            pw VARCHAR(255) NOT NULL,
                            name VARCHAR(50) NOT NULL,
                            birth_date DATE NOT NULL,
                            addr VARCHAR(300) NOT NULL,
                            phone VARCHAR(20) NOT NULL,

                            created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                            role VARCHAR(20) NOT NULL DEFAULT 'USER',
                            agency_no BIGINT REFERENCES agency(agency_no)
                        )
                    """);

            // 3. Create Complaint Table
            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS complaint (
                            complaint_no BIGSERIAL PRIMARY KEY,
                            category VARCHAR(50) NOT NULL,
                            title VARCHAR(200) NOT NULL,
                            content TEXT NOT NULL,
                            address VARCHAR(300),
                            latitude DOUBLE PRECISION,
                            longitude DOUBLE PRECISION,
                            image_path VARCHAR(500),
                            analysis_result JSONB,
                            status VARCHAR(20) NOT NULL DEFAULT 'UNPROCESSED',
                            is_public BOOLEAN NOT NULL DEFAULT TRUE,
                            created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_date TIMESTAMPTZ,
                            completed_date TIMESTAMPTZ,
                            user_no BIGINT NOT NULL REFERENCES app_user(user_no),
                            agency_no BIGINT REFERENCES agency(agency_no),
                            like_count INTEGER DEFAULT 0,
                            answer TEXT
                        )
                    """);

            // 4. Create ComplaintLike Table
            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS complaint_like (
                            like_id BIGSERIAL PRIMARY KEY,
                            complaint_no BIGINT NOT NULL REFERENCES complaint(complaint_no) ON DELETE CASCADE,
                            user_no BIGINT NOT NULL REFERENCES app_user(user_no) ON DELETE CASCADE,
                            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE(complaint_no, user_no)
                        )
                    """);

            // 5. Create ErrorLogs Table
            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS error_logs (
                            log_id BIGSERIAL PRIMARY KEY,
                            trace_id VARCHAR(100),
                            endpoint VARCHAR(200),
                            http_method VARCHAR(10),
                            client_ip VARCHAR(50),
                            user_id VARCHAR(50),
                            error_code VARCHAR(50),
                            error_message TEXT,
                            stack_trace TEXT,
                            timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                        )
                    """);

            // 6. Create SpatialFeature Table
            try {
                jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS postgis");
            } catch (Exception e) {
                log.warn("PostGIS extension creation failed (might need superuser): {}", e.getMessage());
            }

            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS spatial_feature (
                            feature_id BIGSERIAL PRIMARY KEY,
                            feature_type VARCHAR(20),
                            geom GEOMETRY(Geometry, 4326),
                            addr_text VARCHAR(300),
                            complaint_no BIGINT REFERENCES complaint(complaint_no) ON DELETE CASCADE,
                            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                        )
                    """);

            // Ensure columns exist (for existing tables)
            jdbcTemplate.execute(
                    "ALTER TABLE complaint ADD COLUMN IF NOT EXISTS agency_no BIGINT REFERENCES agency(agency_no)");
            jdbcTemplate.execute("ALTER TABLE complaint ADD COLUMN IF NOT EXISTS answer TEXT");
            jdbcTemplate.execute("ALTER TABLE complaint ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0");

            // Ensure role is VARCHAR (handle enum migration)
            try {
                jdbcTemplate.execute("ALTER TABLE app_user ALTER COLUMN role TYPE VARCHAR(20) USING role::text");
            } catch (Exception e) {
                log.warn("Role column alter warning (might already be compatible): {}", e.getMessage());
            }

            log.info("[Seed] Schema migration completed successfully.");
            return ResponseEntity.ok(Map.of("message", "Schema migration completed successfully"));
        } catch (Exception e) {
            log.error("[Seed] Schema migration failed", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetData() {
        complaintMapper.deleteAllLikes();
        complaintMapper.deleteAllComplaints();
        return ResponseEntity.ok(Map.of("message", "All data deleted"));
    }

    @GetMapping("/agencies")
    public ResponseEntity<List<Agency>> getAgencies() {
        return ResponseEntity.ok(agencyMapper.selectAgencyList());
    }

    @PostMapping("/agencies")
    public ResponseEntity<Map<String, Object>> seedAgencies() {
        int count = 0;

        // 1) LOCAL Agencies (17 Regions)
        String[][] localAgencies = {
                { "서울특별시", "11" }, { "부산광역시", "26" }, { "대구광역시", "27" }, { "인천광역시", "28" },
                { "광주광역시", "29" }, { "대전광역시", "30" }, { "울산광역시", "31" }, { "세종특별자치시", "50" },
                { "경기도", "41" }, { "강원특별자치도", "42" }, { "충청북도", "43" }, { "충청남도", "44" },
                { "전북특별자치도", "45" }, { "전라남도", "46" }, { "경상북도", "47" }, { "경상남도", "48" },
                { "제주특별자치도", "49" }
        };

        for (String[] data : localAgencies) {
            if (!agencyMapper.existsByNameAndRegion(data[0], data[1])) {
                com.safeguard.entity.Agency agency = new com.safeguard.entity.Agency();
                agency.setAgencyName(data[0]);
                agency.setRegionCode(data[1]);
                agency.setAgencyType("LOCAL");
                agencyMapper.insertAgency(agency);
                count++;
            }
        }

        // 2) CENTRAL Agencies
        String[] centralAgencies = {
                "경찰청", "국토교통부", "고용노동부", "국방부", "국민권익위원회", "식품의약품안전처",
                "대검찰청", "기획재정부", "행정안전부", "보건복지부", "과학기술정보통신부", "국세청",
                "기후에너지환경부", "법무부", "공정거래위원회", "교육부", "해양수산부", "농림축산식품부",
                "소방청", "인사혁신처", "기타"
        };

        for (String name : centralAgencies) {
            if (!agencyMapper.existsByNameAndRegion(name, null)) {
                com.safeguard.entity.Agency agency = new com.safeguard.entity.Agency();
                agency.setAgencyName(name);
                agency.setRegionCode(null);
                agency.setAgencyType("CENTRAL");
                agencyMapper.insertAgency(agency);
                count++;
            }
        }

        return ResponseEntity.ok(Map.of("message", "Agencies seeded successfully", "count", count));
    }

    @PostMapping("/agency-admins")
    public ResponseEntity<Map<String, Object>> createAgencyAdmins() {
        int count = 0;
        List<Agency> agencies = agencyMapper.selectAgencyList();

        for (Agency agency : agencies) {
            // 기관별 관리자 ID 생성 (예: admin_seoul, admin_busan 등)
            String adminId = "admin_" + agency.getAgencyNo();

            // 이미 존재하면 스킵
            if (userMapper.existsByUserId(adminId)) {
                continue;
            }

            UserDTO adminUser = UserDTO.builder()
                    .userId(adminId)
                    .pw(passwordEncoder.encode("admin123"))
                    .name(agency.getAgencyName() + " 관리자")
                    .birthDate(java.time.LocalDate.of(1980, 1, 1))
                    .addr("서울시 중구 세종대로 110")
                    .phone("02-1234-5678")
                    .role(com.safeguard.enums.UserRole.AGENCY)
                    .agencyNo(agency.getAgencyNo())
                    .build();

            userMapper.insertUser(adminUser);
            log.info("[Seed] Created agency admin: {} for {}", adminId, agency.getAgencyName());
            count++;
        }

        return ResponseEntity.ok(Map.of("message", "Agency admins created successfully", "count", count));
    }

    @PostMapping("/complaints")
    public ResponseEntity<Map<String, Object>> createSeedComplaint(@RequestBody SeedRequest request) {
        try {
            System.out.println(">>> SEED REQUEST START: " + request.getTitle());
            // 먼저 기존에 등록된 유저 찾기 (첫번째 유저 사용)
            UserDTO user = userMapper.findByUserId("testuser")
                    .orElseGet(() -> {
                        try {
                            // 테스트 유저가 없으면 만들기
                            log.info("Creating default test user for seeding...");
                            UserDTO newUser = UserDTO.builder()
                                    .userId("testuser")
                                    .pw(passwordEncoder.encode("testuser123"))
                                    .name("테스트유저")
                                    .birthDate(java.time.LocalDate.of(1990, 1, 1))
                                    .addr("서울시 강남구")

                                    .phone("010-0000-0000")
                                    .role(com.safeguard.enums.UserRole.USER)
                                    .build();
                            userMapper.insertUser(newUser);
                            return userMapper.findByUserId("testuser").orElseThrow();
                        } catch (Exception e) {
                            log.error("Failed to create test user", e);
                            throw new RuntimeException("Test user creation failed: " + e.getMessage());
                        }
                    });
            user = userMapper.findByUserId("testuser")
                    .orElse(null);

            if (user == null) {
                try {
                    log.info("Creating default test user for seeding...");
                    UserDTO newUser = UserDTO.builder()
                            .userId("testuser")
                            .pw(passwordEncoder.encode("testuser123"))
                            .name("테스트유저")
                            .birthDate(java.time.LocalDate.of(1990, 1, 1))
                            .addr("서울시 강남구")
                            .phone("010-0000-0000")
                            .role(com.safeguard.enums.UserRole.USER)
                            .build();

                    userMapper.insertUser(newUser);
                    user = userMapper.findByUserId("testuser")
                            .orElseThrow(() -> new IllegalStateException("Seed user creation failed"));
                } catch (Exception e) {
                    log.error("Failed to create test user", e);
                    throw new RuntimeException("Test user creation failed: " + e.getMessage());
                }
            }

            ComplaintDTO complaint = ComplaintDTO.builder()
                    .title(request.getTitle())
                    .content(request.getDescription())
                    .category(request.getCategory())
                    .address(request.getAddress())
                    .latitude(request.getLatitude())
                    .longitude(request.getLongitude())
                    .imagePath(request.getImagePath())
                    .analysisResult(request.getAnalysisResult())
                    .status(request.getStatus() != null
                            ? com.safeguard.enums.ComplaintStatus.valueOf(request.getStatus())
                            : com.safeguard.enums.ComplaintStatus.UNPROCESSED)
                    .likeCount(request.getLikeCount() != null ? request.getLikeCount() : 0)
                    .createdDate(
                            request.getCreatedDate() != null ? java.time.OffsetDateTime.parse(request.getCreatedDate())
                                    : java.time.OffsetDateTime.now())
                    .isPublic(true)
                    .userNo(user.getUserNo())
                    .agencyNo(request.getAgencyNo())
                    .build();

            complaintMapper.insertComplaintDto(complaint);
            log.info("[Seed] Created complaint #{} for user {}, agency: {}",
                    complaint.getComplaintNo(), user.getUserId(), request.getAgencyNo());

            return ResponseEntity.ok(Map.of(
                    "message", "Complaint created",
                    "id", complaint.getComplaintNo()));
        } catch (Exception e) {
            e.printStackTrace(); // 콘솔에 강제 출력
            log.error("[Seed] CRITICAL ERROR: ", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage() != null ? e.getMessage() : "Unknown error",
                    "type", e.getClass().getName()));
        }
    }

    @PostMapping("/fix-agency-mapping")
    public ResponseEntity<Map<String, Object>> fixAgencyMapping() {
        try {
            log.info("[Seed] Fixing agency mappings for dummy data...");
            int updatedCount = 0;

            // 1. Traffic/Safety -> Police (경찰청)
            updatedCount += jdbcTemplate.update("""
                        UPDATE complaint
                        SET agency_no = (SELECT agency_no FROM agency WHERE agency_name = '경찰청')
                        WHERE category IN ('교통', '경찰·검찰') AND agency_no IS NULL
                    """);

            // 2. Road/Housing -> MOLIT (국토교통부)
            updatedCount += jdbcTemplate.update("""
                        UPDATE complaint
                        SET agency_no = (SELECT agency_no FROM agency WHERE agency_name = '국토교통부')
                        WHERE category IN ('도로', '주택·건축') AND agency_no IS NULL
                    """);

            // 3. Admin/Safety -> MOIS (행정안전부)
            updatedCount += jdbcTemplate.update("""
                        UPDATE complaint
                        SET agency_no = (SELECT agency_no FROM agency WHERE agency_name = '행정안전부')
                        WHERE category = '행정·안전' AND agency_no IS NULL
                    """);

            // 4. Education -> MOE (교육부)
            updatedCount += jdbcTemplate.update("""
                        UPDATE complaint
                        SET agency_no = (SELECT agency_no FROM agency WHERE agency_name = '교육부')
                        WHERE category = '교육' AND agency_no IS NULL
                    """);

            // 5. Health -> MOHW (보건복지부)
            updatedCount += jdbcTemplate.update("""
                        UPDATE complaint
                        SET agency_no = (SELECT agency_no FROM agency WHERE agency_name = '보건복지부')
                        WHERE category = '보건' AND agency_no IS NULL
                    """);

            // 6. Environment -> Environment Ministry (기후에너지환경부)
            updatedCount += jdbcTemplate.update("""
                        UPDATE complaint
                        SET agency_no = (SELECT agency_no FROM agency WHERE agency_name = '기후에너지환경부')
                        WHERE category = '환경' AND agency_no IS NULL
                    """);

            // 7. Industry -> Finance (기획재정부)
            updatedCount += jdbcTemplate.update("""
                        UPDATE complaint
                        SET agency_no = (SELECT agency_no FROM agency WHERE agency_name = '기획재정부')
                        WHERE category = '산업·통상' AND agency_no IS NULL
                    """);

            // 8. Default others -> Seoul (서울특별시) as fallback for Local
            updatedCount += jdbcTemplate.update("""
                        UPDATE complaint
                        SET agency_no = (SELECT agency_no FROM agency WHERE agency_name = '서울특별시')
                        WHERE agency_no IS NULL
                    """);

            log.info("[Seed] Agency mapping fix completed. Updated {} rows.", updatedCount);
            return ResponseEntity.ok(Map.of("message", "Agency mappings updated", "count", updatedCount));

        } catch (Exception e) {
            log.error("[Seed] Failed to fix agency mappings", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bulk-seed")
    public ResponseEntity<Map<String, Object>> generateBulkData() {
        try {
            log.info("[Seed] Starting bulk seed...");
            Random random = new Random();
            int complaintCount = 0;
            int userCount = 0;

            // 1. Create Users with different ages (10s to 60s)
            List<UserDTO> users = new ArrayList<>();
            int[] birthYears = { 2010, 2000, 1990, 1980, 1970, 1960 }; // 10s, 20s, 30s, 40s, 50s, 60s
            String[] ageLabels = { "teen", "twenty", "thirty", "forty", "fifty", "sixty" };

            for (int i = 0; i < birthYears.length; i++) {
                String userId = "user_" + ageLabels[i];
                if (!userMapper.existsByUserId(userId)) {
                    UserDTO user = UserDTO.builder()
                            .userId(userId)
                            .pw(passwordEncoder.encode("password"))
                            .name("User " + ageLabels[i])
                            .birthDate(java.time.LocalDate.of(birthYears[i], 1, 1))
                            .addr("Seoul")
                            .phone("010-0000-" + (1000 + i))
                            .role(com.safeguard.enums.UserRole.USER)
                            .build();
                    userMapper.insertUser(user);
                    // Fetch back to get userNo
                    users.add(userMapper.findByUserId(userId).get());
                    userCount++;
                } else {
                    users.add(userMapper.findByUserId(userId).get());
                }
            }

            // 2. Create Complaints
            String[] categories = { "도로", "불법주차", "청소", "시설", "안전", "교통", "건축" };
            String[] districts = { "강남구", "서초구", "송파구", "마포구", "종로구", "동작구", "영등포구" };

            // Get Agencies for mapping
            List<Agency> agencies = agencyMapper.selectAgencyList();
            if (agencies.isEmpty()) {
                seedAgencies(); // Ensure agencies exist
                agencies = agencyMapper.selectAgencyList();
            }

            for (int i = 0; i < 500; i++) {
                UserDTO randomUser = users.get(random.nextInt(users.size()));
                String category = categories[random.nextInt(categories.length)];
                String district = districts[random.nextInt(districts.length)];

                // Random Status
                com.safeguard.enums.ComplaintStatus status;
                int statusRoll = random.nextInt(10); // 0-9
                if (statusRoll < 2)
                    status = com.safeguard.enums.ComplaintStatus.UNPROCESSED; // 20%
                else if (statusRoll < 5)
                    status = com.safeguard.enums.ComplaintStatus.IN_PROGRESS; // 30%
                else
                    status = com.safeguard.enums.ComplaintStatus.COMPLETED; // 50%

                // Random Date (Last 6 months)
                java.time.OffsetDateTime createdDate = java.time.OffsetDateTime.now()
                        .minusDays(random.nextInt(180));

                java.time.OffsetDateTime completedDate = null;
                if (status == com.safeguard.enums.ComplaintStatus.COMPLETED) {
                    completedDate = createdDate.plusDays(random.nextInt(10) + 1);
                }

                // Random Agency
                Agency agency = agencies.get(random.nextInt(agencies.size()));

                ComplaintDTO complaint = ComplaintDTO.builder()
                        .title(category + " 민원 요청 " + i)
                        .content("민원 내용입니다. " + district + " 지역.")
                        .category(category)
                        .address("서울특별시 " + district)
                        .latitude(37.5 + (random.nextDouble() * 0.1))
                        .longitude(127.0 + (random.nextDouble() * 0.1))
                        .status(status)
                        .createdDate(createdDate)
                        .completedDate(completedDate)
                        .updatedDate(completedDate != null ? completedDate : createdDate)
                        .userNo(randomUser.getUserNo())
                        .agencyNo(agency.getAgencyNo())
                        .isPublic(true)
                        .likeCount(random.nextInt(10))
                        .analysisResult("{\"keywords\": [\"" + category + "\", \"민원\"]}")
                        .build();

                complaintMapper.insertComplaintDto(complaint);
                complaintCount++;
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Bulk seed completed",
                    "usersCreated", userCount,
                    "complaintsCreated", complaintCount));
        } catch (Exception e) {
            log.error("Bulk seed failed", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
