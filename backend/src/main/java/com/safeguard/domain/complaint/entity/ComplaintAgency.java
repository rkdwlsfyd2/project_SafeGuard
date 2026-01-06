package com.safeguard.domain.complaint.entity;

import com.safeguard.domain.user.entity.Agency;
import com.safeguard.domain.user.entity.AppUser;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "complaint_agency")
public class ComplaintAgency {

    @EmbeddedId
    private ComplaintAgencyId id;

    @MapsId("complaintNo")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_no", nullable = false)
    private Complaint complaint;

    @MapsId("agencyNo")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_no", nullable = false)
    private Agency agency;

    @Column(name = "assigned_at")
    private OffsetDateTime assignedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ComplaintStatus status;

    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;

    // assigned_by BIGINT NULL
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private AppUser assignedBy;

    // USER_NO BIGINT NOT NULL (기관 담당자/처리자 용도로 해석)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"USER_NO\"", nullable = false)
    private AppUser user;
}
