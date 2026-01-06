package com.safeguard.domain.complaint.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "complaint_file")
public class ComplaintFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_no")
    private Long fileNo;

    @Column(name = "file_url", nullable = false, length = 300)
    private String fileUrl;

    @Column(name = "file_type", length = 20)
    private String fileType;

    @Column(name = "uploaded_date")
    private OffsetDateTime uploadedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"COMPLAINT_NO\"", nullable = false)
    private Complaint complaint;
}
