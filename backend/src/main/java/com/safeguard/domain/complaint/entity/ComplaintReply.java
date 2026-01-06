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
@Table(name = "complaint_reply", indexes = {
        @Index(name = "ix_reply_complaint_no", columnList = "complaint_no"),
        @Index(name = "ix_reply_created_at", columnList = "created_at")
})
public class ComplaintReply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reply_no")
    private Long replyNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_no", nullable = false)
    private Complaint complaint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_no", nullable = false)
    private AppUser user;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
