package com.safeguard.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class SignupRequest {
    private String userId;
    private String password;
    private String name;
    private LocalDate birthDate; // yyyy-MM-dd
    private String addr;
    private String phone;
    private String email;
    private Long agencyNo; // Optional, only for AGENCY role
}
