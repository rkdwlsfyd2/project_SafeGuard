package com.civilcomplaint.entity;

import lombok.Data;
import org.locationtech.jts.geom.Geometry;

import java.time.OffsetDateTime;

@Data
public class SpatialFeature {
    private Long featureId;

    private String featureType;     // POINT/LINESTRING/POLYGON 등
    private Geometry geom;

    private String addrText;
    private String adminCode;

    private OffsetDateTime createdAt;

    private Long complaintNo;
}
