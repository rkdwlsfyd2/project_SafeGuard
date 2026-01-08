package com.safeguard.controller;

import com.safeguard.security.CustomUserDetails;
import com.safeguard.service.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
@Slf4j
public class ComplaintController {

    private final ComplaintService complaintService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createComplaint(
            @RequestBody Map<String, Object> data,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("Received complaint creation request: {}", data);

        Long userNo = (userDetails != null) ? userDetails.getUserNo() : 1L; // fallback for testing
        Long complaintNo = complaintService.createComplaint(data, userNo);

        Map<String, Object> response = new HashMap<>();
        response.put("complaintNo", complaintNo);
        response.put("message", "민원이 성공적으로 접수되었습니다.");

        return ResponseEntity.ok(response);
    }
}
