package com.safeguard.service;

import com.safeguard.dto.ComplaintListItemDto;
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
//            return mapper.selectClusters(req, gridDeg, limit);
        }

        // 지도는 보통 offset 0 (필요 시 page 개념을 req로 확장)
        return mapper.selectMarkers(req, limit, 0);
    }

    @Override
    public PageResponse<ComplaintListItemDto> listComplaints(MapSearchRequest req, int page, int size) {
        validateBounds(req);

        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        int offset = safePage * safeSize;

        long total = mapper.countComplaintList(req);
        List<ComplaintListItemDto> items = mapper.selectComplaintList(req, safeSize, offset);

        return new PageResponse<>(items, safePage, safeSize, total);
    }

    // ===== 아래는 네 기존 로직을 그대로 유지/이식하면 됨 =====

    private void validateBounds(MapSearchRequest req) {
        // TODO: 기존 validateBounds 로직 그대로 붙여넣기
        // 예: minLat/maxLat/minLng/maxLng null 체크, 범위 체크 등
        if (req == null) throw new IllegalArgumentException("Request is null");
    }

    private boolean useCluster(MapSearchRequest req) {
        // TODO: 기존 로직 그대로
        // 예: 줌이 특정 값 이하이면 클러스터 사용
        Integer zoom = req.getZoom();
        return zoom != null && zoom <= 7;
    }

    private double zoomToGridDeg(Integer zoom) {
        // TODO: 기존 grid 계산 방식 그대로
        if (zoom == null) return 0.02;
        // 단순 예시 (실제는 네 로직에 맞게)
        return Math.max(0.0005, 0.08 / Math.pow(2, Math.max(0, zoom - 3)));
    }

    private int normalizeLimit(Integer reqLimit, int max) {
        if (reqLimit == null) return Math.min(500, max);
        return Math.max(1, Math.min(reqLimit, max));
    }
}
