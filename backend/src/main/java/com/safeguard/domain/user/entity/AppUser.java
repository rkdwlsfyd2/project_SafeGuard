package com.safeguard.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "app_user", indexes = {
        @Index(name = "ix_app_user_login_id", columnList = "login_id", unique = true),
        @Index(name = "ix_app_user_role", columnList = "role")
})
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_no")
    private Long userNo;

    @Column(name = "login_id", nullable = false, length = 50)
    private String loginId;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role;

    // 소속 기관(옵션) - 기관 담당자/관리자 연계용
    @Column(name = "agency_no")
    private Long agencyNo;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}