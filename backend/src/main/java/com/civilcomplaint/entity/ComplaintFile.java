package com.civilcomplaint.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ComplaintFile {
    private Long fileNo;

    private String fileUrl;
    private String fileType;
    private OffsetDateTime uploadedDate;

    private Long complaintNo;
}
