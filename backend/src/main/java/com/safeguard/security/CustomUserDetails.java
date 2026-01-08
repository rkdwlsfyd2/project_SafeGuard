package com.safeguard.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

@Getter
public class CustomUserDetails extends User {
    private final Long userNo;

    public CustomUserDetails(String username, String password, Collection<? extends GrantedAuthority> authorities,
            Long userNo) {
        super(username, password, authorities);
        this.userNo = userNo;
    }
}
