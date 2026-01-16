package com.safeguard.mapper;

import com.safeguard.dto.ComplaintListItemDto;
import com.safeguard.dto.MapClusterDto;
import com.safeguard.dto.MapHotspotDto;
import com.safeguard.dto.MapItemDto;
import com.safeguard.dto.MapSearchRequest;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ComplaintGisMapper {

    // 마커(개별 민원 위치)
    List<MapItemDto> selectMapMarkers(
            @Param("req") MapSearchRequest req,
            @Param("limit") int limit,
            @Param("offset") int offset);

    // 클러스터(줌이 낮을 때)
    List<MapClusterDto> selectMapClusters(
            @Param("req") MapSearchRequest req,
            @Param("gridDeg") double gridDeg,
            @Param("limit") int limit);

    // 핫스팟(PostGIS ST_HexagonGrid 활용)
    List<MapHotspotDto> selectHotspots(
            @Param("req") MapSearchRequest req,
            @Param("gridDeg") double gridDeg);

    // 시군구 통계
    List<com.safeguard.dto.MapDistrictDto> selectDistrictCounts(@Param("req") MapSearchRequest req);

    // 목록
    List<ComplaintListItemDto> selectComplaintMapList(
            @Param("req") MapSearchRequest req,
            @Param("limit") int limit,
            @Param("offset") int offset);

    // 목록 total count
    long countComplaintMapList(@Param("req") MapSearchRequest req);
}
