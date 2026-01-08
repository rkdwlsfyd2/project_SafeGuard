package com.safeguard.service;

import com.safeguard.entity.Complaint;
import com.safeguard.entity.SpatialFeature;
import com.safeguard.enums.ComplaintStatus;
import com.safeguard.mapper.ComplaintMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplaintService {

    private final ComplaintMapper complaintMapper;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Transactional
    public Long createComplaint(Map<String, Object> data, Long userNo) {
        log.info("Creating complaint for user: {}", userNo);

        // 1. Complaint 저장
        Complaint complaint = new Complaint();
        complaint.setCategory((String) data.get("category"));
        complaint.setTitle((String) data.get("title"));
        complaint.setContent((String) data.get("content"));
        complaint.setIsPublic((Boolean) data.get("isPublic"));
        complaint.setStatus(ComplaintStatus.RECEIVED);
        complaint.setUserNo(userNo);

        complaintMapper.insertComplaint(complaint);
        Long complaintNo = complaint.getComplaintNo();

        // 2. Spatial Feature 저장
        @SuppressWarnings("unchecked")
        Map<String, Object> location = (Map<String, Object>) data.get("location");
        if (location != null) {
            SpatialFeature sf = new SpatialFeature();
            sf.setComplaintNo(complaintNo);
            sf.setFeatureType("POINT");
            sf.setAddrText((String) location.get("address"));

            double lat = Double.parseDouble(location.get("lat").toString());
            double lng = Double.parseDouble(location.get("lng").toString());
            sf.setGeom(geometryFactory.createPoint(new Coordinate(lng, lat)));

            complaintMapper.insertSpatialFeature(sf);
        }

        // 3. 만약 RAG 분석 결과로 기관 코드가 있다면 자동 배정 (선택 사항)
        if (data.containsKey("agencyCode")) {
            Integer agencyCode = (Integer) data.get("agencyCode");
            if (agencyCode != null) {
                complaintMapper.insertComplaintAgency(complaintNo, agencyCode.longValue());
            }
        }

        return complaintNo;
    }
}
