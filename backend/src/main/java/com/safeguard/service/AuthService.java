package com.safeguard.service;

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
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

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
                .email(request.getEmail())
                .role(request.getAgencyNo() != null ? "AGENCY" : "USER")
                .agencyNo(request.getAgencyNo())
                .createdDate(OffsetDateTime.now())
                .build();

        userMapper.save(user);
    }

    public Map<String, Object> login(LoginRequest request) {
        UserDTO user = userMapper.findByUserId(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPw())) {
            throw new RuntimeException("Invalid password");
        }

        String token = jwtTokenProvider.createToken(user.getUserId(), user.getRole());

        return Map.of(
                "token", token,
                "user", Map.of(
                        "userId", user.getUserId(),
                        "name", user.getName(),
                        "role", user.getRole()));
    }

    public String findId(String name, String phone) {
        List<UserDTO> users = userMapper.findByNameAndPhone(name, phone);
        if (users.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        return users.stream()
                .map(UserDTO::getUserId)
                .collect(java.util.stream.Collectors.joining(", "));
    }

    // Verify user for password reset
    public void verifyUserForReset(String userId, String phone) {
        userMapper.findByUserIdAndPhone(userId, phone)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // Update password
    @Transactional
    public void updatePassword(String userId, String phone, String newPassword) {
        // Double check for security
        userMapper.findByUserIdAndPhone(userId, phone)
                .orElseThrow(() -> new RuntimeException("User verification failed"));

        userMapper.updatePassword(userId, passwordEncoder.encode(newPassword));
    }

    // Keep legacy for compatibility if needed, or we can remove it later
    @Transactional
    public void resetPassword(String userId, String phone) {
        UserDTO user = userMapper.findByUserIdAndPhone(userId, phone)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String tempPassword = UUID.randomUUID().toString().substring(0, 8);
        log.info("Resetting password for user {}. Temporary password: {}", userId, tempPassword);

        userMapper.updatePassword(userId, passwordEncoder.encode(tempPassword));
    }
}
