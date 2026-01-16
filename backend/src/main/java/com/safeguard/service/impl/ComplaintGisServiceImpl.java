package com.safeguard.service.impl;

import com.safeguard.dto.*;
import com.safeguard.mapper.ComplaintGisMapper;
import com.safeguard.service.ComplaintGisService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComplaintGisServiceImpl implements ComplaintGisService {

    private final ComplaintGisMapper gisMapper;

    @Override
    @Transactional(readOnly = true)
    public List<MapItemDto> getMapItems(MapSearchRequest req) {
        // limit logic if needed
        return gisMapper.selectMapMarkers(req, 1000, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MapHotspotDto> getHotspots(MapSearchRequest req) {
        // zoom level에 따라 gridDeg 조정 가능
        double gridDeg = 0.005; // default ~500m
        if (req.getZoom() != null) {
            if (req.getZoom() < 10) gridDeg = 0.02;
            if (req.getZoom() < 8) gridDeg = 0.05;
        }
        return gisMapper.selectHotspots(req, gridDeg);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MapDistrictDto> getDistrictCounts(MapSearchRequest req) {
        // 지도 범위와 상관없이 전체 통계를 원할 수도 있지만, 일단 req 필터를 따름
        // 전국 단위 시각화이므로 bounds가 전체를 포함하면 전체가 나옴
        return gisMapper.selectDistrictCounts(req);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ComplaintListItemDto> listComplaints(MapSearchRequest req, int page, int size) {
        int offset = (page - 1) * size;
        List<ComplaintListItemDto> content = gisMapper.selectComplaintMapList(req, size, offset);
        long total = gisMapper.countComplaintMapList(req);
        return new PageResponse<>(content, page, size, total);
    }
}
