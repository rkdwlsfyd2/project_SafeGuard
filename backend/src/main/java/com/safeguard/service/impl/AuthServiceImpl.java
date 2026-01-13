package com.safeguard.service.impl;

import com.safeguard.service.AuthService;

import com.safeguard.dto.LoginRequest;
import com.safeguard.dto.SignupRequest;
import com.safeguard.dto.UserDTO;
import com.safeguard.mapper.UserMapper;
import com.safeguard.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * AuthService의 구현체입니다.
 * 회원가입, 로그인, 비밀번호 관리 등 인증 로직을 처리합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 새로운 사용자를 등록합니다.
     * 회원가입 전 사용자 ID 중복을 확인합니다.
     * 저장하기 전에 비밀번호를 암호화합니다.
     *
     * @param request 사용자 상세 정보를 담은 SignupRequest
     */
    @Override
    @Transactional
    public void signup(SignupRequest request) {
        if (userMapper.existsByUserId(request.getUserId())) {
            throw new RuntimeException("이미 등록된 사용자 ID입니다.");
        }

        // 비밀번호 유효성 검사
        validatePassword(request.getPassword());

        // 아이디 유효성 검사 (한글 제한)
        validateUserId(request.getUserId());

        // 생년월일 유효성 검사
        validateBirthDate(request.getBirthDate());

        UserDTO user = UserDTO.builder()
                .userId(request.getUserId())
                .pw(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .birthDate(request.getBirthDate())
                .addr(request.getAddr())
                .phone(request.getPhone())
                .role(request.getAgencyNo() != null ? com.safeguard.enums.UserRole.AGENCY
                        : com.safeguard.enums.UserRole.USER)
                .agencyNo(request.getAgencyNo())
                .createdDate(OffsetDateTime.now())
                .build();

        userMapper.insertUser(user);
    }

    /**
     * 사용자를 인증하고 JWT 토큰과 사용자 정보를 반환합니다.
     * 자격 증명을 검증하고 성공 시 JWT 토큰을 생성합니다.
     *
     * @param request 사용자 ID와 비밀번호를 담은 LoginRequest
     * @return 토큰과 사용자 정보를 담은 Map
     */
    @Override
    public Map<String, Object> login(LoginRequest request) {
        UserDTO user = userMapper.findByUserId(request.getUserId())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 사용자입니다."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPw())) {
            throw new RuntimeException("비밀번호가 일치하지 않습니다.");
        }

        String token = jwtTokenProvider.createToken(user.getUserId(), user.getRole().name());

        java.util.Map<String, Object> userInfo = new java.util.HashMap<>();
        userInfo.put("userId", user.getUserId());
        userInfo.put("name", user.getName());
        userInfo.put("role", user.getRole().name());
        if (user.getAgencyNo() != null) {
            userInfo.put("agencyNo", user.getAgencyNo());
        }

        return Map.of(
                "token", token,
                "user", userInfo);
    }

    /**
     * 이름과 전화번호로 사용자 ID를 찾습니다.
     *
     * @param name  사용자 이름
     * @param phone 사용자 전화번호
     * @return 찾은 사용자 ID 목록 (쉼표로 구분)
     */
    @Override
    public String findId(String name, String phone) {
        List<UserDTO> users = userMapper.selectUserByNameAndPhone(name, phone);
        if (users.isEmpty()) {
            throw new RuntimeException("사용자를 찾을 수 없습니다.");
        }
        return users.stream()
                .map(UserDTO::getUserId)
                .collect(java.util.stream.Collectors.joining(", "));
    }

    /**
     * 비밀번호 재설정을 위해 사용자가 존재하는지 확인합니다.
     *
     * @param userId 사용자 ID
     * @param phone  사용자 전화번호
     */
    @Override
    public void verifyUserForReset(String userId, String phone) {
        userMapper.selectUserByUserIdAndPhone(userId, phone)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    }

    /**
     * 사용자의 비밀번호를 업데이트합니다.
     * 보안을 위해 비밀번호를 업데이트하기 전에 사용자를 다시 확인합니다.
     *
     * @param userId      사용자 ID
     * @param phone       사용자 전화번호 (검증용)
     * @param newPassword 새로운 비밀번호
     */
    @Override
    @Transactional
    public void updatePassword(String userId, String phone, String newPassword) {
        // Double check for security
        userMapper.selectUserByUserIdAndPhone(userId, phone)
                .orElseThrow(() -> new RuntimeException("사용자 검증에 실패했습니다."));

        // 비밀번호 유효성 검사
        validatePassword(newPassword);

        userMapper.updateUserPassword(userId, passwordEncoder.encode(newPassword));
    }

    /**
     * 사용자 ID가 이미 존재하는지 확인합니다.
     *
     * @param userId 확인할 사용자 ID
     * @return 존재하면 true, 그렇지 않으면 false
     */
    @Override
    public boolean isIdDuplicate(String userId) {
        return userMapper.existsByUserId(userId);
    }

    /**
     * 사용자 정보를 조회합니다.
     *
     * @param userId 사용자 ID
     * @return 사용자 정보를 담은 Map
     */
    @Override
    public Map<String, Object> getUserInfo(String userId) {
        UserDTO user = userMapper.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 사용자입니다."));

        return Map.of(
                "userId", user.getUserId(),
                "name", user.getName(),
                "role", user.getRole().name(),
                "phone", user.getPhone() != null ? user.getPhone() : "");
    }

    /**
     * 비밀번호 유효성 검사
     * 1. 8자 이상
     * 2. 공백 포함 금지
     * 3. 특수문자 최소 1개 포함
     *
     * @param password 검사할 비밀번호
     */
    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new RuntimeException("비밀번호는 8자 이상이어야 합니다.");
        }
        if (password.contains(" ")) {
            throw new RuntimeException("비밀번호에 공백을 포함할 수 없습니다.");
        }
        // 특수문자 체크 (!@#$%^&*(),.?":{}|<>)
        if (!password.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            throw new RuntimeException("비밀번호는 특수문자를 최소 1개 이상 포함해야 합니다.");
        }
    }

    /**
     * 아이디 유효성 검사
     * 영문자와 숫자로만 구성되어야 함
     *
     * @param userId 검사할 아이디
     */
    private void validateUserId(String userId) {
        if (userId == null || !userId.matches("^[a-zA-Z0-9]+$")) {
            throw new RuntimeException("아이디는 영문 및 숫자만 가능합니다.");
        }
    }

    /**
     * 생년월일 유효성 검사
     * 미래 날짜일 수 없음
     *
     * @param birthDate 검사할 생년월일
     */
    private void validateBirthDate(java.time.LocalDate birthDate) {
        if (birthDate != null && birthDate.isAfter(java.time.LocalDate.now())) {
            throw new RuntimeException("생년월일은 미래 날짜일 수 없습니다.");
        }
    }
}
