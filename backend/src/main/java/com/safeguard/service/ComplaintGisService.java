package com.safeguard.service;

import com.safeguard.dto.*;

import java.util.List;

public interface ComplaintGisService {
    List<MapItemDto> getMapItems(MapSearchRequest req);

    List<MapHotspotDto> getHotspots(MapSearchRequest req);

    List<MapDistrictDto> getDistrictCounts(MapSearchRequest req);

    PageResponse<ComplaintListItemDto> listComplaints(MapSearchRequest req, int page, int size);
}
