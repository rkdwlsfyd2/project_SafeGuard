package com.civilcomplaint.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long userNo;
    private String email;
    private String name;
    private String role;
    private String createdAt;
}
