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
@Table(name = "\"COMPLAINT_HISTORY\"")
public class ComplaintHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"HISTORY_NO\"")
    private Long historyNo;

    // DDL은 VARCHAR(20)인데, 타입 통일하려면 complaint_status로 바꾸는 게 좋습니다.
    @Enumerated(EnumType.STRING)
    @Column(name = "\"STATUS\"")
    private ComplaintStatus status;

    @Column(name = "\"MEMO\"", columnDefinition = "TEXT")
    private String memo;

    @Column(name = "\"CREATED_DATE\"")
    private OffsetDateTime createdDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"COMPLAINT_NO\"", nullable = false)
    private Complaint complaint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"USER_NO\"", nullable = false)
    private AppUser user;
}
