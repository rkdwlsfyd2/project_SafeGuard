package com.safeguard.domain.complaint.entity;


import com.safeguard.domain.user.entity.AppUser;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "complaint", indexes = {
        @Index(name = "ix_complaint_user_no", columnList = "user_no"),
        @Index(name = "ix_complaint_status", columnList = "status"),
        @Index(name = "ix_complaint_created_at", columnList = "created_at")
})
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "complaint_no")
    private Long complaintNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_no", nullable = false)
    private AppUser user;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "input_type", nullable = false, length = 20)
    private InputType inputType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ComplaintStatus status;

    // 분류 결과(기관)
    @Column(name = "assigned_agency_no")
    private Long assignedAgencyNo;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
