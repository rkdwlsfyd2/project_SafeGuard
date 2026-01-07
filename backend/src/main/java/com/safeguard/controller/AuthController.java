package com.safeguard.controller;

import com.safeguard.dto.LoginRequest;
import com.safeguard.dto.SignupRequest;
import com.safeguard.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            authService.signup(request);
            return ResponseEntity.ok(Map.of("message", "User registered successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            Map<String, Object> result = authService.login(request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/find-id")
    public ResponseEntity<?> findId(@RequestBody Map<String, String> request) {
        try {
            String userId = authService.findId(request.get("name"), request.get("phone"));
            return ResponseEntity.ok(Map.of("userId", userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-reset")
    public ResponseEntity<?> verifyReset(@RequestBody Map<String, String> request) {
        try {
            authService.verifyUserForReset(request.get("userId"), request.get("phone"));
            return ResponseEntity.ok(Map.of("message", "User verified"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/update-password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> request) {
        try {
            authService.updatePassword(
                    request.get("userId"),
                    request.get("phone"),
                    request.get("newPassword"));
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        try {
            authService.resetPassword(request.get("userId"), request.get("phone"));
            return ResponseEntity.ok(Map.of("message", "Temporary password generated. Check server logs (Mock)."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
