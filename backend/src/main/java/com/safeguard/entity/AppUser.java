package com.safeguard.entity;

import com.safeguard.enums.UserRole;
import lombok.Data;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
public class AppUser {
    private Long userNo;
    private String userId;
    private String pw;
    private String name;
    private LocalDate birthDate; // DATE 권장
    private String addr;
    private String phone;
    private String email;

    private OffsetDateTime createdDate; // TIMESTAMPTZ
    private UserRole role;

    // 기관 계정일 때만 값 있음(일반/관리자는 null)
    private Long agencyNo;
}