package com.safeguard.domain.gis.entity;


import com.safeguard.domain.complaint.entity.Complaint;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Geometry;

import java.time.OffsetDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "spatial_feature", indexes = {
        @Index(name = "ix_feature_complaint_no", columnList = "complaint_no"),
        @Index(name = "ix_feature_type", columnList = "feature_type"),
        @Index(name = "ix_feature_admin_code", columnList = "admin_code")
})
public class SpatialFeature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feature_id")
    private Long featureId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_no", nullable = false)
    private Complaint complaint;

    @Column(name = "feature_type", nullable = false, length = 20)
    private String featureType; // POINT / LINESTRING / POLYGON 등

    // PostGIS geometry(Geometry, 4326)
    @Column(name = "geom", nullable = false, columnDefinition = "geometry(Geometry, 4326)")
    private Geometry geom;

    @Column(name = "addr_text", length = 300)
    private String addrText;

    @Column(name = "admin_code", length = 20)
    private String adminCode;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
