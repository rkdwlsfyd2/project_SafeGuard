package com.civilcomplaint.controller;

import com.civilcomplaint.dto.request.ComplaintRequest;
import com.civilcomplaint.security.JwtUserDetails;
import com.civilcomplaint.service.ComplaintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {
    private final ComplaintService complaintService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@AuthenticationPrincipal JwtUserDetails user) {
        return ResponseEntity.ok(complaintService.getComplaints(user != null ? user.getUserNo() : null));
    }

    @GetMapping("/{complaintNo}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Long complaintNo,
            @AuthenticationPrincipal JwtUserDetails user) {
        return ResponseEntity
                .ok(complaintService.getComplaintDetail(complaintNo, user != null ? user.getUserNo() : null));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody ComplaintRequest request,
            @AuthenticationPrincipal JwtUserDetails user) {
        return ResponseEntity.ok(complaintService.createComplaint(request, user.getUserNo()));
    }

    @PutMapping("/{complaintNo}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long complaintNo,
            @RequestBody ComplaintRequest request,
            @AuthenticationPrincipal JwtUserDetails user) {
        return ResponseEntity.ok(complaintService.updateComplaint(complaintNo, request, user.getUserNo()));
    }

    @DeleteMapping("/{complaintNo}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long complaintNo,
            @AuthenticationPrincipal JwtUserDetails user) {
        return ResponseEntity.ok(complaintService.deleteComplaint(complaintNo, user.getUserNo(), user.getRole()));
    }
}
