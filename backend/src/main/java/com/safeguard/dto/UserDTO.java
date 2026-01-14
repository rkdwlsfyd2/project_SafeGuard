package com.safeguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long userNo;
    private String userId;
    private String pw;
    private String name;
    private LocalDate birthDate;
    private String addr;
    private String phone;
    private OffsetDateTime createdDate;
    private com.safeguard.enums.UserRole role; // USER, ADMIN, AGENCY
    private Long agencyNo;
    private String agencyName;
}
