package com.civilcomplaint.dto.request;

import lombok.Data;

@Data
public class ComplaintRequest {
    private String title;
    private String category;
    private String description; // description은 content로 매핑됨
    private String address;
    private Double latitude;
    private Double longitude;
    private String imagePath;
    private String analysisResult;
    private String status;
}
