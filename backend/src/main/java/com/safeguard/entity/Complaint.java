package com.safeguard.entity;

import com.safeguard.enums.ComplaintStatus;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class Complaint {
    private Long complaintNo;

    private String category;
    private String title;
    private String content;

    private ComplaintStatus status;
    private Boolean isPublic;

    private OffsetDateTime createdDate;
    private OffsetDateTime updatedDate;
    private OffsetDateTime completedDate;

    private Long userNo;
}