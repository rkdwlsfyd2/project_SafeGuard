package com.civilcomplaint.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class PostLike {
    private Long likeId;

    private OffsetDateTime createdAt;

    private Long userNo;
    private Long complaintNo;
}
