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

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    @Transactional
    public void signup(SignupRequest request) {
        if (userMapper.existsByUserId(request.getUserId())) {
            throw new RuntimeException("User ID already registered");
        }

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

    @Override
    public Map<String, Object> login(LoginRequest request) {
        UserDTO user = userMapper.findByUserId(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPw())) {
            throw new RuntimeException("Invalid password");
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

    @Override
    public String findId(String name, String phone) {
        List<UserDTO> users = userMapper.selectUserByNameAndPhone(name, phone);
        if (users.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        return users.stream()
                .map(UserDTO::getUserId)
                .collect(java.util.stream.Collectors.joining(", "));
    }

    // Verify user for password reset
    @Override
    public void verifyUserForReset(String userId, String phone) {
        userMapper.selectUserByUserIdAndPhone(userId, phone)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // Update password
    @Override
    @Transactional
    public void updatePassword(String userId, String phone, String newPassword) {
        // Double check for security
        userMapper.selectUserByUserIdAndPhone(userId, phone)
                .orElseThrow(() -> new RuntimeException("User verification failed"));

        userMapper.updateUserPassword(userId, passwordEncoder.encode(newPassword));
    }

    // Keep legacy for compatibility if needed, or we can remove it later
    @Override
    @Transactional
    public void resetPassword(String userId, String phone) {
        UserDTO user = userMapper.selectUserByUserIdAndPhone(userId, phone)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String tempPassword = UUID.randomUUID().toString().substring(0, 8);
        log.info("Resetting password for user {}. Temporary password: {}", userId, tempPassword);

        userMapper.updateUserPassword(userId, passwordEncoder.encode(tempPassword));
    }

    @Override
    public Map<String, Object> getUserInfo(String userId) {
        UserDTO user = userMapper.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return Map.of(
                "userId", user.getUserId(),
                "name", user.getName(),
                "role", user.getRole().name(),
                "phone", user.getPhone() != null ? user.getPhone() : "");
    }
}
