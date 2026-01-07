package com.civilcomplaint.mapper;

import com.civilcomplaint.entity.Complaint;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface ComplaintMapper {
    List<Complaint> findAll();

    List<Complaint> findByUserNo(@Param("userNo") Long userNo);

    Optional<Complaint> findByComplaintNo(@Param("complaintNo") Long complaintNo);

    void insert(Complaint complaint);

    void update(Complaint complaint);

    void deleteByComplaintNo(@Param("complaintNo") Long complaintNo);
}
