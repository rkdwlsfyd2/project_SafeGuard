package com.safeguard.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "agency", indexes = {
        @Index(name = "ix_agency_name", columnList = "name")
})
public class Agency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "agency_no")
    private Long agencyNo;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "agency_type", length = 50)
    private String agencyType; // 예: CENTRAL, LOCAL, PUBLIC 등
}
