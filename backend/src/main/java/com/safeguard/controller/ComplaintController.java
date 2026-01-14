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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
                } else {
                    // agencyNo not enforced for general filtering unless explicitly requested,
                    // but we might want to keep the option to filter by agencyNo if passed by
                    // param?
                    // The requirement says:
                    // Checkbox ON -> myAgencyOnly=true -> filter by my agency
                    // Checkbox OFF -> myAgencyOnly=false -> show all (or filtered by region)
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
        params.put("agencyNo", agencyNo); // Will be null if myAgencyOnly is false
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
     * 특정 민원 상세 정보 조회 (좋아요 여부 포함)
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getComplaintDetail(@PathVariable Long id) {
        ComplaintDTO c = complaintMapper.findByComplaintNo(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        Map<String, Object> result = new HashMap<>();
        result.put("complaintNo", c.getComplaintNo());
        result.put("title", c.getTitle());
        result.put("content", c.getContent());
        result.put("category", c.getCategory());
        result.put("status", c.getStatus());
        result.put("address", c.getAddress());
        result.put("latitude", c.getLatitude());
        result.put("longitude", c.getLongitude());
        result.put("imagePath", c.getImagePath());
        result.put("createdDate", c.getCreatedDate());
        result.put("authorName", "익명사용자");
        result.put("likeCount", c.getLikeCount() != null ? c.getLikeCount() : 0);
        result.put("answer", c.getAnswer());
        result.put("assignedAgencyText", c.getAssignedAgencyText());

        // 현재 로그인한 사용자의 좋아요 상태 확인 (임시로 testuser 사용 가능)
        Long userNo = userMapper.findByUserId("testuser").map(UserDTO::getUserNo).orElse(1L);
        result.put("liked", complaintMapper.isLikedByUser(id, userNo));

        return ResponseEntity.ok(result);
    }

    /**
     * 민원 좋아요 토글 기능
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@PathVariable Long id) {
        Long userNo = userMapper.findByUserId("testuser").map(UserDTO::getUserNo).orElse(1L);
        boolean liked = complaintMapper.checkUserLike(id, userNo) > 0;

        if (liked) {
            complaintMapper.deleteLike(id, userNo);
            complaintMapper.decreaseLikeCount(id);
        } else {
            complaintMapper.insertLike(id, userNo);
            complaintMapper.updateLikeCount(id);
        }

        ComplaintDTO c = complaintMapper.findByComplaintNo(id).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "message", "success",
                "likeCount", c.getLikeCount(),
                "liked", !liked));
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
    public ResponseEntity<List<ComplaintDTO>> getMyComplaints(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userNo = (userDetails != null) ? userDetails.getUserNo() : 1L;
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        List<ComplaintDTO> myComplaints = complaintMapper.selectComplaintListByUserNo(params);
        return ResponseEntity.ok(myComplaints);
    }

    /**
     * 관리자 대시보드용 통계 데이터 조회 (실시간 폴링 대응)
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(@RequestParam(required = false) String category) {
        Long agencyNo = null;
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            UserDTO user = userMapper.findByUserId(auth.getName()).orElse(null);
            if (user != null && user.getRole() == UserRole.AGENCY) {
                agencyNo = user.getAgencyNo();
            }
        }

        Map<String, Object> stats = complaintService.getDashboardStats(agencyNo, category);
        return ResponseEntity.ok(stats);
    }

    /**
     * 공통 이미지 업로드 기능
     */
    @PostMapping("/images")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("image") org.springframework.web.multipart.MultipartFile file) {
        try {
            String fileName = fileService.storeFile(file);
            String imagePath = "/uploads/" + fileName;
            return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                    .body(Map.of("imagePath", imagePath));
        } catch (Exception e) {
            log.error("Image upload failed", e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /*
     * ===============================
     * 통계 (대시보드)
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

        ComplaintStatsDTO stats = complaintMapper.selectComplaintStats(agencyNo);
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

        /*
         * 1. 로그인 사용자 기준 agencyNo
         */
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
