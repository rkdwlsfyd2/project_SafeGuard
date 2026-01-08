package com.safeguard.mapper;

import com.safeguard.entity.Complaint;
import com.safeguard.entity.SpatialFeature;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ComplaintMapper {
    void insertComplaint(Complaint complaint);

    void insertSpatialFeature(SpatialFeature spatialFeature);

    void insertComplaintAgency(@Param("complaintNo") Long complaintNo, @Param("agencyNo") Long agencyNo);
}
