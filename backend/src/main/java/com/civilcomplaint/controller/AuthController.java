package com.civilcomplaint.controller;

import com.civilcomplaint.dto.request.LoginRequest;
import com.civilcomplaint.dto.request.RegisterRequest;
import com.civilcomplaint.dto.response.LoginResponse;
import com.civilcomplaint.dto.response.UserResponse;
import com.civilcomplaint.security.JwtUserDetails;
import com.civilcomplaint.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse user = authService.register(request);
        Map<String, Object> result = new HashMap<>();
        result.put("message", "Registration successful");
        result.put("user", user);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal JwtUserDetails user) {
        return ResponseEntity.ok(authService.getUserInfo(user.getUserNo()));
    }
}
