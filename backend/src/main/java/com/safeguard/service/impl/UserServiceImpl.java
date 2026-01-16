package com.safeguard.service.impl;

import com.safeguard.dto.UserDTO;
import com.safeguard.mapper.ComplaintMapper;
import com.safeguard.mapper.UserMapper;
import com.safeguard.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final ComplaintMapper complaintMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDTO getUserProfile(Long userNo) {
        return userMapper.selectUserByUserNo(userNo)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    }

    @Override
    @Transactional
    public void updateProfile(Long userNo, UserDTO userDTO) {
        UserDTO existingUser = userMapper.selectUserByUserNo(userNo)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 수정 가능한 필드만 업데이트
        existingUser.setName(userDTO.getName());
        existingUser.setAddr(userDTO.getAddr());
        existingUser.setPhone(userDTO.getPhone());
        existingUser.setBirthDate(userDTO.getBirthDate());

        userMapper.updateUser(existingUser);
    }

    @Override
    @Transactional
    public void updatePassword(Long userNo, String currentPassword, String newPassword) {
        UserDTO user = userMapper.selectUserByUserNo(userNo)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 현재 비밀번호 검증
        if (!passwordEncoder.matches(currentPassword, user.getPw())) {
            throw new RuntimeException("현재 비밀번호가 일치하지 않습니다.");
        }

        // 새 비밀번호 유효성 검사
        validatePassword(newPassword);

        // 비밀번호 암호화 및 업데이트
        userMapper.updateUserPassword(user.getUserId(), passwordEncoder.encode(newPassword));
    }

    @Override
    @Transactional
    public void deleteAccount(Long userNo) {
        if (!userMapper.selectUserByUserNo(userNo).isPresent()) {
            throw new RuntimeException("사용자를 찾을 수 없습니다.");
        }
        
        // 유저가 작성한 민원 및 관련 데이터 삭제 (연쇄 삭제 지원용)
        complaintMapper.deleteByUserNo(userNo);
        
        userMapper.deleteUserByUserNo(userNo);
    }

    /**
     * 비밀번호 유효성 검사 (AuthServiceImpl 로직 참조)
     */
    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new RuntimeException("비밀번호는 8자 이상이어야 합니다.");
        }
        if (password.contains(" ")) {
            throw new RuntimeException("비밀번호에 공백을 포함할 수 없습니다.");
        }
        if (!password.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            throw new RuntimeException("비밀번호는 특수문자를 최소 1개 이상 포함해야 합니다.");
        }
    }
}
