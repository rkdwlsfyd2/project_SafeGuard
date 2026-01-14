package com.safeguard.mapper;

import com.safeguard.entity.Agency;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface AgencyMapper {
    void insertAgency(Agency agency);

    List<Agency> selectAgencyList();

    Agency selectAgencyByNo(@Param("agencyNo") Long agencyNo);

    boolean existsByNameAndRegion(@Param("agencyName") String agencyName, @Param("regionCode") String regionCode);

    Agency selectAgencyByName(@Param("agencyName") String agencyName);
}
