package com.safeguard.mapper;

import com.safeguard.dto.ComplaintListItemDto;
import com.safeguard.dto.MapClusterDto;
import com.safeguard.dto.MapItemDto;
import com.safeguard.dto.MapSearchRequest;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ComplaintGisMapper {

    // 마커(개별 민원 위치)
    List<MapItemDto> selectMarkers(
            @Param("req") MapSearchRequest req,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    // 클러스터(줌이 낮을 때)
    List<MapClusterDto> selectClusters(
            @Param("req") MapSearchRequest req,
            @Param("gridDeg") double gridDeg,
            @Param("limit") int limit
    );

    // 목록
    List<ComplaintListItemDto> selectComplaintList(
            @Param("req") MapSearchRequest req,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    // 목록 total count
    long countComplaintList(@Param("req") MapSearchRequest req);
}
