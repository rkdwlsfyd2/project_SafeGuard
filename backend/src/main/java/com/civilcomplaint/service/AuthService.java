package com.civilcomplaint.service;

import com.civilcomplaint.dto.request.LoginRequest;
import com.civilcomplaint.dto.request.RegisterRequest;
import com.civilcomplaint.dto.response.LoginResponse;
import com.civilcomplaint.dto.response.UserResponse;
import com.civilcomplaint.entity.AppUser;
import com.civilcomplaint.mapper.UserMapper;
import com.civilcomplaint.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
        private final UserMapper userMapper;
        private final PasswordEncoder passwordEncoder;
        private final JwtTokenProvider jwtTokenProvider;

        @Transactional
        public UserResponse register(RegisterRequest request) {
                if (userMapper.existsByEmail(request.getEmail())) {
                        throw new RuntimeException("Email already exists");
                }
                AppUser user = AppUser.builder()
                                .email(request.getEmail())
                                .userId(request.getEmail())
                                .pw(passwordEncoder.encode(request.getPassword()))
                                .name(request.getName())
                                .role(com.civilcomplaint.enums.UserRole.USER)
                                .build();
                userMapper.insert(user);
                log.info("[Auth] Register success: {}", request.getEmail());
                return UserResponse.builder()
                                .userNo(user.getUserNo())
                                .email(user.getEmail())
                                .name(user.getName())
                                .role(user.getRole() != null ? user.getRole().name() : null)
                                .build();
        }

        @Transactional(readOnly = true)
        public LoginResponse login(LoginRequest request) {
                AppUser user = userMapper.findByEmail(request.getEmail())
                                .orElseThrow(() -> new RuntimeException("Invalid credentials"));
                if (!passwordEncoder.matches(request.getPassword(), user.getPw())) {
                        throw new RuntimeException("Invalid credentials");
                }
                String token = jwtTokenProvider.generateToken(user.getUserNo(), user.getEmail(),
                                user.getRole().name());
                log.info("[Auth] Login success: {}", request.getEmail());
                return LoginResponse.builder()
                                .message("Login successful")
                                .token(token)
                                .user(UserResponse.builder()
                                                .userNo(user.getUserNo())
                                                .email(user.getEmail())
                                                .name(user.getName())
                                                .role(user.getRole() != null ? user.getRole().name() : null)
                                                .build())
                                .build();
        }

        @Transactional(readOnly = true)
        public UserResponse getUserInfo(Long userNo) {
                AppUser user = userMapper.findByUserNo(userNo)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                return UserResponse.builder()
                                .userNo(user.getUserNo())
                                .email(user.getEmail())
                                .name(user.getName())
                                .role(user.getRole() != null ? user.getRole().name() : null)
                                .createdAt(user.getCreatedDate() != null ? user.getCreatedDate().toString() : null)
                                .build();
        }
}
