package com.civilcomplaint.controller;

import com.civilcomplaint.dto.request.ComplaintRequest;
import com.civilcomplaint.entity.AppUser;
import com.civilcomplaint.mapper.UserMapper;
import com.civilcomplaint.service.ComplaintService;
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

    private final ComplaintService complaintService;
    private final UserMapper userMapper;

    @PostMapping("/complaints")
    public ResponseEntity<Map<String, Object>> createSeedComplaint(@RequestBody ComplaintRequest request) {
        // Default to test user
        String defaultEmail = "test@test.com";
        AppUser user = userMapper.findByEmail(defaultEmail)
                .orElseThrow(() -> new RuntimeException("Default seed user 'test@test.com' not found. Please run register first."));
        
        log.info("Seeding complaint for user: {}", user.getEmail());
        return ResponseEntity.ok(complaintService.createComplaint(request, user.getUserNo()));
    }
}
