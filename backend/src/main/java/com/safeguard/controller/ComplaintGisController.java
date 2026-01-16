package com.safeguard.controller;

import com.safeguard.dto.*;
import com.safeguard.service.ComplaintGisService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/gis")
public class ComplaintGisController {

    private final ComplaintGisService complaintGisService;
    private final com.safeguard.mapper.UserMapper userMapper;

    private void enforceAgency(MapSearchRequest req) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            String userId = auth.getName();
            com.safeguard.dto.UserDTO currentUser = userMapper.findByUserId(userId).orElse(null);
            if (currentUser != null) {
                // AGENCY 역할인 경우, 프론트엔드에서 agencyNo를 보냈을 때(내 담당민원 토글 On)만 본인 기관으로 필터링.
                // 보내지 않았다면(null 상태) 모든 민원 노출을 허용함.
                if (currentUser.getRole() == com.safeguard.enums.UserRole.AGENCY) {
                    if (req.getAgencyNo() != null) {
                        req.setAgencyNo(currentUser.getAgencyNo());
                    }
                }
                // ADMIN은 프론트엔드에서 보낸 값을 존중함 (기본 null이면 전체 노출)
            }
        }
    }

    /**
     * 지도에 그릴 아이템(줌 기준으로 마커/클러스터 자동 분기)
     *
     * 호출 예:
     * /api/gis/map-items?swLat=..&swLng=..&neLat=..&neLng=..&zoom=6&category=...&status=...
     */
    @GetMapping("/map-items")
    public List<MapItemDto> mapItems(@ModelAttribute MapSearchRequest req) {
        enforceAgency(req);
        return complaintGisService.getMapItems(req);
    }

    /**
     * PostGIS ST_HexagonGrid 기반 핫스팟 데이터
     */
    @GetMapping("/hotspots")
    public List<MapHotspotDto> hotspots(@ModelAttribute MapSearchRequest req) {
        enforceAgency(req);
        return complaintGisService.getHotspots(req);
    }

    /**
     * 시군구별 민원 건수 (Choropleth용)
     */
    @GetMapping("/districts")
    public List<MapDistrictDto> districtCounts(@ModelAttribute MapSearchRequest req) {
        enforceAgency(req);
        return complaintGisService.getDistrictCounts(req);
    }

    /**
     * 오른쪽 목록(페이지네이션)
     *
     * 호출 예:
     * /api/gis/complaints?swLat=..&swLng=..&neLat=..&neLng=..&page=0&size=20
     */
    @GetMapping("/complaints")
    public PageResponse<ComplaintListItemDto> list(
            @ModelAttribute MapSearchRequest req,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        enforceAgency(req);
        return complaintGisService.listComplaints(req, page, size);
    }
}
