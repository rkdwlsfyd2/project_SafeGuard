package com.safeguard.controller;

import com.safeguard.dto.ComplaintDTO;
import com.safeguard.dto.SeedRequest;
import com.safeguard.dto.UserDTO;
import com.safeguard.mapper.ComplaintMapper;
import com.safeguard.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/seed")
@RequiredArgsConstructor
public class SeedController {

    private final ComplaintMapper complaintMapper;
    private final UserMapper userMapper;

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetData() {
        complaintMapper.deleteAllLikes();
        complaintMapper.deleteAllComplaints();
        return ResponseEntity.ok(Map.of("message", "All data deleted"));
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
                                    .pw("$2a$10$dummyHashedPasswordForSeeding")
                                    .name("테스트유저")
                                    .birthDate(java.time.LocalDate.of(1990, 1, 1))
                                    .addr("서울시 강남구")
                                    .phone("010-0000-0000")
                                    .email("test@test.com")
                                    .role(com.safeguard.enums.UserRole.USER)
                                    .build();
                            userMapper.save(newUser);
                            return userMapper.findByUserId("testuser").orElseThrow();
                        } catch (Exception e) {
                            log.error("Failed to create test user", e);
                            throw new RuntimeException("Test user creation failed: " + e.getMessage());
                        }
                    });

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
                            : com.safeguard.enums.ComplaintStatus.RECEIVED)
                    .likeCount(request.getLikeCount() != null ? request.getLikeCount() : 0)
                    .createdDate(
                            request.getCreatedDate() != null ? java.time.OffsetDateTime.parse(request.getCreatedDate())
                                    : java.time.OffsetDateTime.now())
                    .isPublic(true)
                    .userNo(user.getUserNo())
                    .build();

            complaintMapper.insert(complaint);
            log.info("[Seed] Created complaint #{} for user {}", complaint.getComplaintNo(), user.getUserId());

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
}
