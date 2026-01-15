package com.safeguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintDTO {
    private Long complaintNo;
    private String authorName;
    private Long seqNo;
    private String title;
    private String content;
    private String answer;
    private String category;
    private String address;
    private Double latitude;
    private Double longitude;
    private String imagePath;
    private String analysisResult;
    private com.safeguard.enums.ComplaintStatus status;
    private Boolean isPublic;
    private OffsetDateTime createdDate;
    private OffsetDateTime updatedDate;
    private OffsetDateTime completedDate;
    private Integer likeCount;
    private Long userNo;
    private Long agencyNo;
    private String agencyName;
    private String assignedAgencyText;
    private String regionName;
    private String regionCode;
    // Reaction fields
    private String myReaction;
    private Boolean isMyPost;
    private Boolean isAssignedToMe;
    private Integer dislikeCount;
}
