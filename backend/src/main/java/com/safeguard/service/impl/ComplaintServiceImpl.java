package com.safeguard.service.impl;

import com.safeguard.service.ComplaintService;
import com.safeguard.service.FileService;

import com.safeguard.entity.Agency;
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

import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.IOException;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintMapper complaintMapper;
    private final FileService fileService;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    private final com.safeguard.mapper.AgencyMapper agencyMapper;

    @Override
    @Transactional
    public Long createComplaint(Map<String, Object> data, org.springframework.web.multipart.MultipartFile file,
            Long userNo) {
        logToFile("DEBUG: [ComplaintService] Start creating complaint for user: " + userNo);
        logToFile("DEBUG: [ComplaintService] Incoming Data Map: " + data);

        String imagePath = (String) data.get("imagePath");
        if (file != null && !file.isEmpty()) {
            try {
                String fileName = fileService.storeFile(file);
                imagePath = "/uploads/" + fileName;
            } catch (Exception e) {
                log.error("Failed to upload file during complaint creation", e);
            }
        }

        // 1. Complaint 저장
        Complaint complaint = new Complaint();
        complaint.setCategory((String) data.get("category"));
        complaint.setTitle((String) data.get("title"));
        complaint.setContent((String) data.get("content"));
        complaint.setIsPublic((Boolean) data.get("isPublic"));
        complaint.setStatus(ComplaintStatus.UNPROCESSED);
        complaint.setUserNo(userNo);
        complaint.setImagePath(imagePath);

        // 위치 정보 설정
        @SuppressWarnings("unchecked")
        Map<String, Object> location = (Map<String, Object>) data.get("location");
        if (location != null) {
            String addr = (String) location.get("address");
            complaint.setAddress(addr);
            logToFile("DEBUG: [ComplaintService] Address set: " + addr);

            if (location.containsKey("lat") && location.containsKey("lng")) {
                complaint.setLatitude(Double.parseDouble(location.get("lat").toString()));
                complaint.setLongitude(Double.parseDouble(location.get("lng").toString()));
            }
        }

        // 기관 정보 설정 (AI 결과)
        // agencyCode(ApplyImage) 또는 agency_code(ApplyText)
        Long aiAgencyNo = null;
        Object codeObj = data.getOrDefault("agencyCode", data.get("agency_code"));

        if (codeObj != null) {
            try {
                long val = Long.parseLong(codeObj.toString());
                if (val > 0)
                    aiAgencyNo = val;
            } catch (Exception e) {
                logToFile("DEBUG: [ComplaintService] Failed to parse agency code: " + codeObj);
            }
        }

        // 코드가 없으면 이름으로 백엔드에서 다시 찾아보기 (agencyName, agency_name, agency)
        if (aiAgencyNo == null) {
            Object nameObj = data.getOrDefault("agencyName", data.getOrDefault("agency_name", data.get("agency")));
            String searchName = (nameObj != null) ? nameObj.toString() : null;

            // 만약 이름도 없다면 카테고리를 기반으로 매핑 시도 (Fallback)
            if (searchName == null || searchName.isEmpty() || "-".equals(searchName)) {
                String category = (String) data.get("category");
                searchName = getCentralAgencyByCategory(category);
                logToFile("DEBUG: [ComplaintService] Falling back to category-based mapping: " + category + " -> " + searchName);
            }

            if (searchName != null && !searchName.isEmpty()) {
                logToFile("DEBUG: [ComplaintService] Finding AI Agency by Name: " + searchName);
                Agency match = agencyMapper.selectAgencyByName(searchName);
                if (match != null) {
                    aiAgencyNo = match.getAgencyNo();
                    logToFile("DEBUG: [ComplaintService] AI Agency Match Found: " + match.getAgencyName()
                            + " (ID: " + aiAgencyNo + ")");
                }
            }
        }

        if (aiAgencyNo != null) {
            complaint.setAgencyNo(aiAgencyNo);
            logToFile("DEBUG: [ComplaintService] Final AI Agency No: " + aiAgencyNo);
        }

        complaintMapper.insertComplaint(complaint);
        Long complaintNo = complaint.getComplaintNo();
        logToFile("DEBUG: [ComplaintService] Complaint inserted with No: " + complaintNo);

        // 2. Spatial Feature 저장
        if (location != null && location.containsKey("lat") && location.containsKey("lng")) {
            try {
                SpatialFeature sf = new SpatialFeature();
                sf.setComplaintNo(complaintNo);
                sf.setFeatureType("POINT");
                sf.setAddrText((String) location.get("address"));
                double lat = Double.parseDouble(location.get("lat").toString());
                double lng = Double.parseDouble(location.get("lng").toString());
                sf.setGeom(geometryFactory.createPoint(new Coordinate(lng, lat)));
                complaintMapper.insertSpatialFeature(sf);
            } catch (Exception e) {
                logToFile("DEBUG: [ComplaintService] Spatial feature insert failed: " + e.getMessage());
            }
        }

        // 3. 기관 매핑 (Multi-Agency Assignment)
        // A. 소관 부처 (AI 결과)
        if (aiAgencyNo != null) {
            complaintMapper.insertComplaintAgency(complaintNo, aiAgencyNo);
            logToFile("DEBUG: [ComplaintService] Inserted AI Agency Relationship: " + aiAgencyNo);
        }

        // B. 관할 지자체 (주소 기반)
        if (complaint.getAddress() != null && !complaint.getAddress().isEmpty()) {
            String[] addrParts = complaint.getAddress().split(" ");
            if (addrParts.length > 0) {
                String regionName = addrParts[0];
                logToFile("DEBUG: [ComplaintService] Region lookup start: " + regionName);

                Agency regionAgency = agencyMapper.selectAgencyByName(regionName);

                if (regionAgency != null) {
                    Long regionNo = regionAgency.getAgencyNo();
                    logToFile("DEBUG: [ComplaintService] Found Region Agency: " + regionAgency.getAgencyName()
                            + "(" + regionNo + ")");

                    // 중복 방지
                    if (aiAgencyNo == null || !aiAgencyNo.equals(regionNo)) {
                        complaintMapper.insertComplaintAgency(complaintNo, regionNo);
                        logToFile("DEBUG: [ComplaintService] Inserted Regional Agency Relationship: " + regionNo);
                    } else {
                        logToFile("DEBUG: [ComplaintService] Regional Agency skipped (same as AI Agency)");
                    }
                } else {
                    logToFile("DEBUG: [ComplaintService] Region lookup failed for: " + regionName);
                }
            }
        }

        return complaintNo;
    }

    private String getCentralAgencyByCategory(String category) {
        if (category == null) return null;
        switch (category) {
            case "도로": return "국토교통부";
            case "행정·안전": return "행정안전부";
            case "교통": return "경찰청";
            case "주택·건축": return "행정안전부";
            case "환경": return "기후에너지환경부";
            default: return null;
        }
    }

    private void logToFile(String message) {
        String logPath = "c:\\project_SafeGuard\\backend_debug.log";
        try (FileWriter fw = new FileWriter(logPath, true);
                PrintWriter pw = new PrintWriter(fw)) {
            pw.println("[" + LocalDateTime.now() + "] " + message);
        } catch (IOException e) {
            log.error("Failed to write to debug log file", e);
        }
    }
}
