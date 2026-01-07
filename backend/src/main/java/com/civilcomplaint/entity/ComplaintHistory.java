package com.civilcomplaint.entity;

import com.civilcomplaint.enums.ComplaintStatus;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ComplaintHistory {
    private Long historyNo;

    private ComplaintStatus status;
    private String memo;

    private OffsetDateTime createdDate;

    private Long complaintNo;
    private Long userNo;
}
