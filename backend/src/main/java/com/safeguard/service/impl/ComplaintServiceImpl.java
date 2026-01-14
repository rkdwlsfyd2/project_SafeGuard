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
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
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

    /**
     * 민원 생성 처리 (위치 정보 및 AI 분석 기반 기관 할당 포함)
     */
    @Override
    @Transactional
    public Long createComplaint(Map<String, Object> data, org.springframework.web.multipart.MultipartFile file,
            Long userNo) {
        log.info("민원 생성 시작 - 사용자 번호: {}", userNo);
        // 디버그용 로그 기록 (필요 시)
        logToFile("DEBUG: [ComplaintService] Start creating complaint for user: " + userNo);

        String imagePath = (String) data.get("imagePath");
        // 파일이 첨부된 경우 서버에 저장하고 경로 획득
        if (file != null && !file.isEmpty()) {
            try {
                String fileName = fileService.storeFile(file);
                imagePath = fileName; // S3 Migration: storeFile returns full URL
            } catch (Exception e) {
                log.error("파일 업로드 실패", e);
            }
        }

        // 1. 민원 기본 정보(Complaint 엔티티) 설정 및 저장
        Complaint complaint = new Complaint();
        complaint.setCategory((String) data.get("category"));
        complaint.setTitle((String) data.get("title"));
        complaint.setContent((String) data.get("content"));
        complaint.setIsPublic((Boolean) data.get("isPublic"));
        complaint.setStatus(ComplaintStatus.UNPROCESSED);
        complaint.setUserNo(userNo);
        complaint.setImagePath(imagePath);

        // 주소 및 위경도 정보 설정
        @SuppressWarnings("unchecked")
        Map<String, Object> location = (Map<String, Object>) data.get("location");
        if (location != null) {
            String addr = (String) location.get("address");
            complaint.setAddress(addr);
            if (location.containsKey("lat") && location.containsKey("lng")) {
                complaint.setLatitude(Double.parseDouble(location.get("lat").toString()));
                complaint.setLongitude(Double.parseDouble(location.get("lng").toString()));
            }
        }

        // 2. AI 분석 결과 기반 기관 번호(AgencyNo) 설정
        Long aiAgencyNo = null;
        Object codeObj = data.getOrDefault("agencyCode", data.get("agency_code"));

        if (codeObj != null) {
            try {
                long val = Long.parseLong(codeObj.toString());
                if (val > 0)
                    aiAgencyNo = val;
            } catch (Exception e) {
                log.warn("기관 코드 파싱 실패: {}", codeObj);
            }
        }

        // 코드가 없는 경우 기관명으로 재검색 (Fallback 로직)
        if (aiAgencyNo == null) {
            Object nameObj = data.getOrDefault("agencyName", data.getOrDefault("agency_name", data.get("agency")));
            if (nameObj != null && !nameObj.toString().isEmpty()) {
                String searchName = nameObj.toString();
                Agency match = agencyMapper.selectAgencyByName(searchName);
                if (match != null) {
                    aiAgencyNo = match.getAgencyNo();
                }
            }
        }

        if (aiAgencyNo != null) {
            complaint.setAgencyNo(aiAgencyNo);
        }

        // DB에 민원 저장 (complaint_no 생성됨)
        complaintMapper.insertComplaint(complaint);
        Long complaintNo = complaint.getComplaintNo();

        // 3. GIS 기능을 위한 공간 정보(Spatial Feature) 저장
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
                log.error("공간 정보 저장 실패", e);
            }
        }

        // 4. 다중 기관 매핑 처리 (ComplaintAgency)
        // A. 직접적인 소관 부처 매핑 (AI 결과)
        if (aiAgencyNo != null) {
            complaintMapper.insertComplaintAgency(complaintNo, aiAgencyNo);
        }

        // B. 관할 지자체 매핑 (주소의 시/군/구 기반)
        if (complaint.getAddress() != null && !complaint.getAddress().isEmpty()) {
            String[] addrParts = complaint.getAddress().split(" ");
            if (addrParts.length > 0) {
                String regionName = addrParts[0]; // 예: 서울특별시
                Agency regionAgency = agencyMapper.selectAgencyByName(regionName);

                if (regionAgency != null) {
                    Long regionNo = regionAgency.getAgencyNo();
                    // AI 분석 결과와 중복되지 않는 경우에만 추가 매핑
                    if (aiAgencyNo == null || !aiAgencyNo.equals(regionNo)) {
                        complaintMapper.insertComplaintAgency(complaintNo, regionNo);
                    }
                }
            }
        }

        return complaintNo;
    }

    /**
     * 대시보드용 각종 통계 정보 조회 및 조립
     */
    @Override
    public Map<String, Object> getDashboardStats(Long agencyNo, String category) {
        log.info("대시보드 통계 조회 시작 - 기관: {}, 카테고리: {}", agencyNo, category);

        Map<String, Object> stats = new java.util.HashMap<>();

        // 1. 상태별 요약 정보 (전체, 오늘, 접수, 처리중, 완료 및 SLA 준수율 포함)
        com.safeguard.dto.ComplaintStatsDTO summary = complaintMapper.selectComplaintStats(agencyNo);
        if (summary != null) {
            stats.put("summary", summary);
        } else {
            stats.put("summary", new com.safeguard.dto.ComplaintStatsDTO());
        }

        // 2. 카테고리별 민원 건수 분포
        stats.put("categoryStats", complaintMapper.selectCategoryStats(agencyNo));

        // 3. 최근 6개월간 월별 접수/완료 추이 (카테고리 필터링 적용)
        stats.put("monthlyTrend", complaintMapper.selectMonthlyTrend(category));

        // 4. 자치구별 미처리 민원이 많은 곳 (병목 구간 TOP 10)
        stats.put("bottleneck", complaintMapper.selectAgencyBottleneck());

        // 5. 자치구별 처리가 지연된(3일 초과) 민원 명수 (TOP 10)
        stats.put("bottleneckOverdue", complaintMapper.selectDistrictOverdue());

        // 6. 민원인의 연령대별 분포 통계
        stats.put("ageGroupStats", complaintMapper.selectAgeGroupStats());

        // 7. 실시간 지연 민원 리스트 (3일 이상 처리 안 된 건들)
        stats.put("overdueList", complaintMapper.selectOverdueComplaintList());

        return stats;
    }

    /**
     * 파일 로그 기록을 위한 헬퍼 메서드
     */
    private void logToFile(String message) {
        String logPath = "./backend_debug.log";
        try (FileWriter fw = new FileWriter(logPath, true);
                PrintWriter pw = new PrintWriter(fw)) {
            pw.println("[" + LocalDateTime.now() + "] " + message);
        } catch (IOException e) {
            log.error("로그 파일 쓰기 실패", e);
        }
    }
}
