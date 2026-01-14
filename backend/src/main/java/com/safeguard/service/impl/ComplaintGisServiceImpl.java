package com.safeguard.service.impl;

import com.safeguard.dto.ComplaintListItemDto;
import com.safeguard.dto.MapHotspotDto;
import com.safeguard.dto.MapItemDto;
import com.safeguard.dto.MapSearchRequest;
import com.safeguard.dto.PageResponse;
import com.safeguard.mapper.ComplaintGisMapper;
import com.safeguard.service.ComplaintGisService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComplaintGisServiceImpl implements ComplaintGisService {

    private final ComplaintGisMapper mapper;

    @Override
    public List<MapItemDto> getMapItems(MapSearchRequest req) {
        validateBounds(req);

        int limit = normalizeLimit(req.getLimit(), 2000);

        if (useCluster(req)) {
            double gridDeg = zoomToGridDeg(req.getZoom());
            // 클러스터 사용 시 반환 로직 (현재 비활성)
            // return mapper.selectMapClusters(req, gridDeg, limit);
        }

        // 지도는 보통 offset 0 (필요 시 page 개념을 req로 확장)
        return mapper.selectMapMarkers(req, limit, 0);
    }

    @Override
    public List<MapHotspotDto> getHotspots(MapSearchRequest req) {
        validateBounds(req);
        double gridDeg = zoomToGridDegForHotspot(req.getZoom());
        return mapper.selectHotspots(req, gridDeg);
    }

    @Override
    public PageResponse<ComplaintListItemDto> listComplaints(MapSearchRequest req, int page, int size) {
        validateBounds(req);

        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        int offset = safePage * safeSize;

        long total = mapper.countComplaintMapList(req);
        List<ComplaintListItemDto> items = mapper.selectComplaintMapList(req, safeSize, offset);

        return new PageResponse<>(items, safePage, safeSize, total);
    }

    // ===== 내부 유틸 =====

    private void validateBounds(MapSearchRequest req) {
        // TODO: 기존 validateBounds 로직 유지
        // 예: minLat/maxLat/minLng/maxLng null 체크, 범위 체크 등
        if (req == null) {
            throw new IllegalArgumentException("Request is null");
        }
    }

    private boolean useCluster(MapSearchRequest req) {
        // TODO: 기존 로직 유지
        // 예: 줌이 특정 값 이하이면 클러스터 사용
        Integer zoom = req.getZoom();
        return zoom != null && zoom <= 7;
    }

    private double zoomToGridDeg(Integer zoom) {
        // TODO: 기존 grid 계산 방식 유지
        if (zoom == null) {
            return 0.02;
        }
        // 단순 예시 (실제는 기존 로직에 맞게 조정)
        return Math.max(0.0005, 0.08 / Math.pow(2, Math.max(0, zoom - 3)));
    }

    private double zoomToGridDegForHotspot(Integer zoom) {
        if (zoom == null) return 0.005;
        // 훨씬 촘촘한 격자를 위해 도 단위를 작게 조정 (참고 이미지 수준의 미려함 목표)
        if (zoom <= 2) return 0.0001; // 매우 상세
        if (zoom <= 3) return 0.0002;
        if (zoom <= 4) return 0.0005;
        if (zoom <= 5) return 0.001;
        if (zoom <= 6) return 0.002;
        if (zoom <= 7) return 0.005;
        if (zoom <= 8) return 0.01;
        if (zoom <= 9) return 0.02;
        return 0.04;
    }

    private int normalizeLimit(Integer reqLimit, int max) {
        if (reqLimit == null) {
            return Math.min(500, max);
        }
        return Math.max(1, Math.min(reqLimit, max));
    }
}
