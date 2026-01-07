package com.safeguard.dto;

import lombok.Data;

@Data
public class SeedRequest {
    private String title;
    private String description;
    private String category;
    private String address;
    private Double latitude;
    private Double longitude;
    private String imagePath;
    private String analysisResult;
    private String status;
    private Integer likeCount;
    private String createdDate;
}
