package com.safeguard.controller;

import com.safeguard.dto.LoginRequest;
import com.safeguard.dto.SignupRequest;
import com.safeguard.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 인증 관련 API 컨트롤러
 * 회원가입, 로그인, 아이디/비밀번호 찾기 등을 처리합니다.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 회원가입 처리
     * 
     * @param request 회원가입 정보 (ID, PW, 이름, 등)
     * @return 성공 메시지
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok(Map.of("message", "회원가입이 완료되었습니다."));
    }

    /**
     * 아이디 중복 검사
     * 
     * @param userId 검사할 아이디
     * @return 중복 여부 (true/false)
     */
    @GetMapping("/check-id")
    public ResponseEntity<?> checkIdDuplicate(@RequestParam String userId) {
        boolean isDuplicate = authService.isIdDuplicate(userId);
        return ResponseEntity.ok(Map.of("isDuplicate", isDuplicate));
    }

    /**
     * 로그인 처리
     * 
     * @param request 로그인 정보 (ID, PW)
     * @return JWT 토큰 및 사용자 정보
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Map<String, Object> result = authService.login(request);
        return ResponseEntity.ok(result);
    }

    /**
     * 아이디 찾기
     * 
     * @param request 이름, 전화번호
     * @return 조회된 사용자 ID
     */
    @PostMapping("/find-id")
    public ResponseEntity<?> findId(@RequestBody Map<String, String> request) {
        String userId = authService.findId(request.get("name"), request.get("phone"));
        return ResponseEntity.ok(Map.of("userId", userId));
    }

    /**
     * 비밀번호 재설정을 위한 사용자 검증
     * 
     * @param request 아이디, 전화번호
     * @return 성공 메시지
     */
    @PostMapping("/verify-reset")
    public ResponseEntity<?> verifyReset(@RequestBody Map<String, String> request) {
        authService.verifyUserForReset(request.get("userId"), request.get("phone"));
        return ResponseEntity.ok(Map.of("message", "사용자 검증이 완료되었습니다."));
    }

    /**
     * 비밀번호 변경
     * 
     * @param request 아이디, 전화번호, 새 비밀번호
     * @return 성공 메시지
     */
    @PostMapping("/update-password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> request) {
        authService.updatePassword(
                request.get("userId"),
                request.get("phone"),
                request.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "비밀번호가 성공적으로 변경되었습니다."));
    }

    /**
     * 현재 로그인된 사용자 정보 조회
     * 
     * @param authentication 인증 객체
     * @return 사용자 정보
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMe(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("인증되지 않았습니다.");
        }
        String userId = authentication.getName();
        return ResponseEntity.ok(authService.getUserInfo(userId));
    }
}
