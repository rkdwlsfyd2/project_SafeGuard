package com.safeguard.domain.complaint.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class ComplaintAgencyId implements Serializable {
    @Column(name = "complaint_no")
    private Long complaintNo;

    @Column(name = "agency_no")
    private Long agencyNo;
}
