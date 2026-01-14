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
            if (currentUser != null && currentUser.getRole() == com.safeguard.enums.UserRole.AGENCY) {
                req.setAgencyNo(currentUser.getAgencyNo());
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
