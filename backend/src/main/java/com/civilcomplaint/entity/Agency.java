package com.civilcomplaint.entity;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class Agency {
    private Long agencyNo;
    private String agencyType;
    private String agencyName;
    private String regionCode;
    private OffsetDateTime createdAt;
}
