package com.civilcomplaint.entity;

import com.civilcomplaint.enums.UserRole;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppUser {
    private Long userNo;
    private String userId; // 이메일로도 사용 가능
    private String email; // 명시적 이메일 필드 추가
    private String pw;
    private String name;

    private LocalDate birthDate;
    private String addr;
    private String phone;

    private OffsetDateTime createdDate;
    private UserRole role; // USER, ADMIN 등

    // 기관 계정일 때만 값 있음(일반/관리자는 null)
    private Long agencyNo;
}