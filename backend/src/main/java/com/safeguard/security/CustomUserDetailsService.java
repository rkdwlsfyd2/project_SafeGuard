package com.safeguard.security;

import com.safeguard.dto.UserDTO;
import com.safeguard.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserMapper userMapper;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userMapper.findByUserId(username)
                .map(user -> createUserDetails(user))
                .orElseThrow(() -> new UsernameNotFoundException("해당 아이디의 사용자를 찾을 수 없습니다: " + username));
    }

    private UserDetails createUserDetails(UserDTO user) {
        return new CustomUserDetails(
                user.getUserId(),
                user.getPw(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole())),
                user.getUserNo());
    }
}
