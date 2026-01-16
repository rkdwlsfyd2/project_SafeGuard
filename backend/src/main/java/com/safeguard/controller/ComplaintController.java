package com.safeguard.controller;

import com.safeguard.dto.ComplaintDTO;
import com.safeguard.dto.ComplaintStatsDTO;
import com.safeguard.dto.UserDTO;
import com.safeguard.enums.ComplaintStatus;
import com.safeguard.enums.UserRole;
import com.safeguard.mapper.ComplaintMapper;
import com.safeguard.mapper.UserMapper;
import com.safeguard.security.CustomUserDetails;
import com.safeguard.service.ComplaintService;
import com.safeguard.service.FileService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintMapper complaintMapper;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final ComplaintService complaintService;
    private final FileService fileService;
    private final ObjectMapper objectMapper;

    /**
     * 민원 목록 조회 (페이징, 검색, 필터링 기능 제공)
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getComplaints(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "false") boolean myAgencyOnly,
            @RequestParam(defaultValue = "complaint_no") String sort,
            @RequestParam(defaultValue = "DESC") String order,
            @RequestParam(required = false) String region) {

        // 로그인한 기관 사용자인 경우 해당 기관의 민원만 필터링하도록 agencyNo 확보
        Long agencyNo = null;
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getPrincipal())) {
            UserDTO user = userMapper.findByUserId(auth.getName()).orElse(null);
            if (user != null && user.getRole() == UserRole.AGENCY) {
                if (myAgencyOnly) {
                    agencyNo = user.getAgencyNo();
                }
            }
        }

        int offset = (page - 1) * limit;

        Map<String, Object> params = new HashMap<>();
        params.put("search", search);
        params.put("category", category);
        params.put("status", status);
        params.put("region", region);
        params.put("sort", sort);
        params.put("order", order);
        params.put("agencyNo", agencyNo); // myAgencyOnly=true 인 경우만 값 존재
        params.put("limit", limit);
        params.put("offset", offset);

        // 페이징 처리된 목록과 전체 개수 조회
        List<ComplaintDTO> complaints = complaintMapper.findAll(params);
        long totalCount = complaintMapper.countAll(params);
        int totalPages = (int) Math.ceil((double) totalCount / limit);

        // 응답 맵 구성
        Map<String, Object> response = new HashMap<>();
        response.put("complaints", complaints);

        Map<String, Object> pagination = new HashMap<>();
        pagination.put("currentPage", page);
        pagination.put("limit", limit);
        pagination.put("totalCount", totalCount);
        pagination.put("totalPages", totalPages);
        response.put("pagination", pagination);

        return ResponseEntity.ok(response);
    }

    /**
     * 특정 민원 상세 정보 조회 (내 반응/내 글 여부 포함)
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getComplaintDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long userNo = (userDetails != null) ? userDetails.getUserNo() : 0L;
        String role = null;
        Long agencyNo = null;

        if (userDetails != null) {
            UserDTO userDto = userMapper.findByUserId(userDetails.getUsername()).orElse(null);
            if (userDto != null) {
                role = (userDto.getRole() != null) ? userDto.getRole().name() : null;
                agencyNo = userDto.getAgencyNo();
            }
        }

        // [Strict] Service 계층에서 데이터 조회 및 권한 검사 수행
        Map<String, Object> result = complaintService.getComplaintDetail(id, userNo, role, agencyNo);

        return ResponseEntity.ok(result);
    }

    /*
     * ===============================
     * 좋아요/싫어요 토글 (Reaction)
     * ===============================
     */
    @PostMapping("/{id}/reaction")
    public ResponseEntity<Map<String, Object>> toggleReaction(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long userNo = userDetails.getUserNo();
        String type = body.getOrDefault("type", "LIKE"); // "LIKE" or "DISLIKE"

        // self-post 방지 포함 조회
        ComplaintDTO c = complaintMapper.findByComplaintNo(id, userNo, null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));

        if (Boolean.TRUE.equals(c.getIsMyPost())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "본인 글에는 반응할 수 없습니다."));
        }

        String currentReaction = complaintMapper.findReactionByUser(id, userNo);

        if (currentReaction == null) {
            // New reaction
            complaintMapper.insertReaction(id, userNo, type);
        } else if (currentReaction.equals(type)) {
            // Toggle off
            complaintMapper.deleteReaction(id, userNo);
        } else {
            // Change type
            complaintMapper.updateReaction(id, userNo, type);
        }

        // 카운트 최신화 및 재조회
        complaintMapper.updateComplaintLikeCount(id);
        ComplaintDTO updated = complaintMapper.findByComplaintNo(id, userNo, null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("message", "success");
        response.put("likeCount", updated.getLikeCount());
        response.put("dislikeCount", updated.getDislikeCount());
        response.put("myReaction", updated.getMyReaction());

        return ResponseEntity.ok(response);
    }

    /**
     * (호환용) 기존 좋아요 토글 엔드포인트 유지가 필요하면 사용
     * - 프론트가 /like 를 계속 호출하는 동안만 임시로 유지
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLikeCompat(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        return toggleReaction(id, Map.of("type", "LIKE"), userDetails);
    }

    /**
     * 민원 처리 상태 변경 (관리자 전용)
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            ComplaintStatus status = ComplaintStatus.valueOf(body.get("status"));
            complaintMapper.updateStatus(id, status.name());
            return ResponseEntity.ok(Map.of("message", "Status updated"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Update failed: " + e.getMessage()));
        }
    }

    /**
     * 민원 답변 등록 및 수정
     */
    @PatchMapping("/{id}/answer")
    public ResponseEntity<Map<String, String>> updateAnswer(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            complaintMapper.updateAnswer(id, body.get("answer"));
            return ResponseEntity.ok(Map.of("message", "Answer updated"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Update failed: " + e.getMessage()));
        }
    }

    /**
     * 민원 삭제 (Soft Delete)
     * - 관리자(기관 담당자) 전용
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteComplaint(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long userNo = userDetails.getUserNo();
        UserDTO userDto = userMapper.findByUserId(userDetails.getUsername()).orElse(null);

        if (userDto == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String role = (userDto.getRole() != null) ? userDto.getRole().name() : null;
        Long agencyNo = userDto.getAgencyNo();

        complaintService.deleteComplaint(id, userNo, role, agencyNo);

        return ResponseEntity.ok(Map.of("message", "민원이 삭제되었습니다."));
    }

    /**
     * 신규 민원 등록 처리
     */
    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public ResponseEntity<Map<String, Object>> createComplaint(
            @RequestPart("complaint") String complaintJson,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws JsonProcessingException {

        log.info("민원 등록 요청 수신: {}", complaintJson);
        Long userNo = (userDetails != null) ? userDetails.getUserNo() : 1L;

        @SuppressWarnings("unchecked")
        Map<String, Object> data = objectMapper.readValue(complaintJson, Map.class);
        Long complaintNo = complaintService.createComplaint(data, file, userNo);

        return ResponseEntity.ok(Map.of(
                "complaintNo", complaintNo,
                "message", "민원이 성공적으로 접수되었습니다."));
    }

    /**
     * 현재 로그인한 사용자의 민원 목록 조회 (마이페이지용)
     */
    @GetMapping("/mypage")
    public ResponseEntity<List<ComplaintDTO>> getMyComplaints(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long userNo = (userDetails != null) ? userDetails.getUserNo() : 1L;
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);

        List<ComplaintDTO> myComplaints = complaintMapper.selectComplaintListByUserNo(params);
        return ResponseEntity.ok(myComplaints);
    }

    /**
     * 관리자 대시보드용 통계 데이터 조회 (실시간 폴링 대응)
     * - 기존 /stats 와 매핑 충돌 방지를 위해 /stats/dashboard 로 분리
     */
    @GetMapping("/stats/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "MONTH") String timeBasis) {

        Long agencyNo = null;
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            UserDTO user = userMapper.findByUserId(auth.getName()).orElse(null);
            if (user != null && user.getRole() == UserRole.AGENCY) {
                agencyNo = user.getAgencyNo();
            }
        }

        Map<String, Object> stats = complaintService.getDashboardStats(agencyNo, category, timeBasis);
        return ResponseEntity.ok(stats);
    }

    /**
     * 공통 이미지 업로드 기능
     */
    @PostMapping("/images")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("image") MultipartFile file) {
        try {
            String imagePath = fileService.storeFile(file);
            // String imagePath = "/uploads/" + fileName; // S3 Migration: storeFile returns
            // full URL
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("imagePath", imagePath));
        } catch (Exception e) {
            log.error("Image upload failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /*
     * ===============================
     * 통계 (대시보드 요약)
     * ===============================
     */
    @GetMapping("/stats")
    public ResponseEntity<ComplaintStatsDTO> getStats() {
        Long agencyNo = null;
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getPrincipal())) {
            UserDTO user = userMapper.findByUserId(auth.getName()).orElse(null);
            if (user != null && user.getRole() == UserRole.AGENCY) {
                agencyNo = user.getAgencyNo();
            }
        }

        ComplaintStatsDTO stats = complaintMapper.selectComplaintStats(agencyNo, null);
        if (stats == null) {
            stats = new ComplaintStatsDTO();
        }
        return ResponseEntity.ok(stats);
    }

    /*
     * ===============================
     * 좋아요 상위 5개 (필터 지원)
     * ===============================
     */
    @GetMapping("/top-liked")
    public ResponseEntity<List<ComplaintDTO>> getTopLikedComplaints(
            @RequestParam(required = false) String status) {

        Long agencyNo = null;
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getPrincipal())) {

            UserDTO user = userMapper.findByUserId(auth.getName()).orElse(null);
            if (user != null && user.getRole() == UserRole.AGENCY) {
                agencyNo = user.getAgencyNo();
            }
        }

        List<ComplaintDTO> result = complaintMapper.selectTopLikedComplaints(status, agencyNo);
        return ResponseEntity.ok(result);
    }
}
