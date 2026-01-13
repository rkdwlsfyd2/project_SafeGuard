package com.safeguard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@AllArgsConstructor
public class ComplaintListItemDto {
    private Long complaintNo;
    private String category;
    private String title;
    private String status;
    private OffsetDateTime createdDate;

    private String address;
    private String adminCode;
    private Double lat;
    private Double lng;
    private String imagePath;
}
