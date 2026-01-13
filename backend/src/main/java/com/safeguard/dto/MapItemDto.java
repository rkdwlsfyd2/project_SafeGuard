package com.safeguard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MapItemDto {

    private MapItemType type;
    private Double lat;
    private Double lng;

    // MARKER
    private Long complaintNo;
    private String category;
    private String title;
    private String status;
    private String address;
    private String imagePath;

    // CLUSTER
    private Integer count;
    private String clusterKey;
}