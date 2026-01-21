package com.safeguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long notificationId;
    private Long userNo;
    private Long complaintNo;
    private String type; // STATUS, ANSWER, MANAGER (Frontend contract)
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
