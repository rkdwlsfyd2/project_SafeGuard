package com.civilcomplaint.security;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JwtUserDetails {
    private Long userNo;
    private String email;
    private String role;
}
