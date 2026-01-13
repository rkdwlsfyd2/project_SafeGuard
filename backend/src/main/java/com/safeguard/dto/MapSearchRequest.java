package com.safeguard.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
public class MapSearchRequest {
    private Double swLat;
    private Double swLng;
    private Double neLat;
    private Double neLng;

    private Integer zoom; // kakao level
    private String category;
    private String status; // complaint_status enum string
    private String adminCode;

    private OffsetDateTime from;
    private OffsetDateTime to;

    private Integer limit;
    private Long agencyNo;
}
