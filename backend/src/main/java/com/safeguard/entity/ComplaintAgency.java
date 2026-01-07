package com.safeguard.entity;

import com.safeguard.enums.AgencyTaskStatus;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ComplaintAgency {
    private Long complaintNo;
    private Long agencyNo;

    private OffsetDateTime assignedAt;
    private AgencyTaskStatus status;

    private String memo;

    // 배정 수행자(관리자/시스템)
    private Long assignedBy;

    // 실제 처리 담당 기관 계정(선택)
    private Long handlerUserNo;
}
