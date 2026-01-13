package com.safeguard.controller;

import com.safeguard.dto.ComplaintDTO;
import com.safeguard.dto.UserDTO;
import com.safeguard.enums.ComplaintStatus;
import com.safeguard.enums.UserRole;
import com.safeguard.mapper.ComplaintMapper;
import com.safeguard.mapper.UserMapper;
import com.safeguard.security.CustomUserDetails;
import com.safeguard.service.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping
    public ResponseEntity<Map<String, Object>> getComplaints(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {

        /*
         * ===============================
         * 1. 로그인 사용자 기준 agencyNo
         * ===============================
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

        /*
         * ===============================
         * 2. MyBatis 파라미터 Map
         * ===============================
         */
        int offset = (page - 1) * limit;

        Map<String, Object> params = new HashMap<>();
        params.put("search", search);
        params.put("category", category);
        params.put("status", status);
        params.put("agencyNo", agencyNo);
        params.put("limit", limit);
        params.put("offset", offset);

        /*
         * ===============================
         * 3. DB 조회 (페이징 포함)
         * ===============================
         */
        List<ComplaintDTO> complaints = complaintMapper.findAll(params);

        /*
         * ===============================
         * 4. 응답 구성
         * ===============================
         */
        Map<String, Object> response = new HashMap<>();
        response.put("complaints", complaints);

        Map<String, Object> pagination = new HashMap<>();
        pagination.put("currentPage", page);
        pagination.put("limit", limit);
        pagination.put("count", complaints.size());

        response.put("pagination", pagination);

        return ResponseEntity.ok(response);
    }

    /*
     * ===============================
     * 민원 상세
     * ===============================
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

        Long userNo = userMapper.findByUserId("testuser")
                .map(UserDTO::getUserNo)
                .orElse(1L);

        result.put("liked", complaintMapper.isLikedByUser(id, userNo));

        return ResponseEntity.ok(result);
    }

    /*
     * ===============================
     * 좋아요 토글
     * ===============================
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@PathVariable Long id) {

        Long userNo = userMapper.findByUserId("testuser")
                .map(UserDTO::getUserNo)
                .orElse(1L);

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

    /*
     * ===============================
     * 상태 변경
     * ===============================
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        ComplaintStatus status = ComplaintStatus.valueOf(body.get("status"));
        complaintMapper.updateStatus(id, status);

        return ResponseEntity.ok(Map.of("message", "Status updated"));
    }

    /*
     * ===============================
     * 답변 등록
     * ===============================
     */
    @PatchMapping("/{id}/answer")
    public ResponseEntity<Map<String, String>> updateAnswer(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        complaintMapper.updateAnswer(id, body.get("answer"));
        return ResponseEntity.ok(Map.of("message", "Answer updated"));
    }

    /*
     * ===============================
     * 민원 생성
     * ===============================
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createComplaint(
            @RequestBody Map<String, Object> data,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long userNo = (userDetails != null) ? userDetails.getUserNo() : 1L;
        Long complaintNo = complaintService.createComplaint(data, userNo);

        return ResponseEntity.ok(Map.of(
                "complaintNo", complaintNo,
                "message", "민원이 성공적으로 접수되었습니다."));
    }
}
