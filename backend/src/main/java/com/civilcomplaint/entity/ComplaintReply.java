package com.civilcomplaint.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ComplaintReply {
    private Long replyNo;

    private String content;
    private OffsetDateTime createdAt;

    private Long complaintNo;
    private Long userNo;
}
