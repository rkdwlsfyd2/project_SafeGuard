package com.safeguard.service.impl;

import com.safeguard.service.ComplaintService;
import com.safeguard.service.FileService;

import com.safeguard.entity.Agency;
import com.safeguard.entity.Complaint;
import com.safeguard.entity.SpatialFeature;
import com.safeguard.dto.ComplaintDTO;
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
import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.io.IOException;

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
            String searchName = (nameObj != null) ? nameObj.toString() : null;

            // 만약 이름도 없다면 카테고리를 기반으로 매핑 시도 (Fallback)
            if (searchName == null || searchName.isEmpty() || "-".equals(searchName)) {
                String category = (String) data.get("category");
                searchName = getCentralAgencyByCategory(category);
                logToFile("DEBUG: [ComplaintService] Falling back to category-based mapping: " + category + " -> "
                        + searchName);
            }

            if (searchName != null && !searchName.isEmpty()) {
                logToFile("DEBUG: [ComplaintService] Finding AI Agency by Name: " + searchName);
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
                String regionName = normalizeRegionName(addrParts[0]);
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

    private String getCentralAgencyByCategory(String category) {
        if (category == null)
            return null;
        switch (category) {
            case "도로":
                return "국토교통부";
            case "행정·안전":
                return "행정안전부";
            case "교통":
                return "경찰청";
            case "주택·건축":
                return "행정안전부";
            case "환경":
                return "기후에너지환경부";
            default:
                return null;
        }
    }

    private String normalizeRegionName(String shortName) {
        if (shortName == null)
            return "";
        if (shortName.startsWith("서울"))
            return "서울특별시";
        if (shortName.startsWith("부산"))
            return "부산광역시";
        if (shortName.startsWith("대구"))
            return "대구광역시";
        if (shortName.startsWith("인천"))
            return "인천광역시";
        if (shortName.startsWith("광주"))
            return "광주광역시";
        if (shortName.startsWith("대전"))
            return "대전광역시";
        if (shortName.startsWith("울산"))
            return "울산광역시";
        if (shortName.startsWith("세종"))
            return "세종특별자치시";
        if (shortName.startsWith("경기"))
            return "경기도";
        if (shortName.startsWith("강원"))
            return "강원특별자치도";
        if (shortName.startsWith("충북"))
            return "충청북도";
        if (shortName.startsWith("충남"))
            return "충청남도";
        if (shortName.startsWith("전북"))
            return "전북특별자치도";
        if (shortName.startsWith("전남"))
            return "전라남도";
        if (shortName.startsWith("경북"))
            return "경상북도";
        if (shortName.startsWith("경남"))
            return "경상남도";
        if (shortName.startsWith("제주"))
            return "제주특별자치도";
        return shortName;
    }

    /**
     * 대시보드용 각종 통계 정보 조회 및 조립
     */
    @Override
    public Map<String, Object> getDashboardStats(Long agencyNo, String category, String timeBasis) {
        log.info("대시보드 통계 조회 시작 - 기관: {}, 카테고리: {}", agencyNo, category);

        Map<String, Object> stats = new java.util.HashMap<>();

        // 1. 상태별 요약 정보 (전체, 오늘, 접수, 처리중, 완료 및 SLA 준수율 포함)
        com.safeguard.dto.ComplaintStatsDTO summary = complaintMapper.selectComplaintStats(agencyNo, category);
        if (summary != null) {
            stats.put("summary", summary);
        } else {
            stats.put("summary", new com.safeguard.dto.ComplaintStatsDTO());
        }

        // 2. 카테고리별 민원 건수 분포
        stats.put("categoryStats", complaintMapper.selectCategoryStats(agencyNo));

        // 3. 최근 N기간 트렌드 추이 (카테고리 필터링 및 시간 단위 적용)
        log.info("트렌드 조회 - 카테고리: {}, 시간단위: {}", category, timeBasis);
        stats.put("monthlyTrend", complaintMapper.selectMonthlyTrend(category, timeBasis, agencyNo));

        // 4. 자치구별 미처리 민원이 많은 곳 (병목 구간 TOP 10)
        stats.put("bottleneck", complaintMapper.selectAgencyBottleneck(agencyNo));

        // 5. 자치구별 처리가 지연된(3일 초과) 민원 명수 (TOP 10)
        stats.put("bottleneckOverdue", complaintMapper.selectDistrictOverdue(agencyNo));

        // 6. 민원인의 연령대별 분포 통계
        stats.put("ageGroupStats", complaintMapper.selectAgeGroupStats(agencyNo));

        // 7. 실시간 지연 민원 리스트 (3일 이상 처리 안 된 건들)
        stats.put("overdueList", complaintMapper.selectOverdueComplaintList(agencyNo));

        // [DEBUG] AgencyNo Confirmation
        stats.put("debugAgencyNo", agencyNo);

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

    /**
     * 민원 상세 조회 (접근 권한 엄격 제어)
     */
    @Override
    public Map<String, Object> getComplaintDetail(Long complaintNo, Long userNo, String role, Long agencyNo) {
        // AGENCY 권한인 경우에만 viewerAgencyNo 전달하여 권한 여부(isAssignedToMe) 판단
        Long viewerAgencyNo = (role != null && role.equals("AGENCY")) ? agencyNo : null;
        Long safeUserNo = (userNo != null) ? userNo : 0L;

        com.safeguard.dto.ComplaintDTO c = complaintMapper.findByComplaintNo(complaintNo, safeUserNo, viewerAgencyNo)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Complaint not found"));

        // 🎯 [Strict] Java Logic: assignedAgencyNos 기반으로 isAssignedToMe 재계산
        if (viewerAgencyNo != null) {
            java.util.List<Long> assignedList = c.getAssignedAgencyNos();
            if (assignedList.contains(viewerAgencyNo)) {
                c.setIsAssignedToMe(true);
            }
        }

        // [Strict Access Control] 비공개 민원 접근 제어
        if (Boolean.FALSE.equals(c.getIsPublic())) {
            boolean isWriter = Boolean.TRUE.equals(c.getIsMyPost());
            boolean isAssigned = Boolean.TRUE.equals(c.getIsAssignedToMe());
            boolean isAdmin = role != null && role.equals("ADMIN");

            // 작성자, 담당자, 관리자 중 어느 하나도 해당하지 않으면 차단
            if (!isWriter && !isAssigned && !isAdmin) {
                // 요구사항: HTTP 200 OK, Body: { "message": "비공개된 게시물입니다" }
                // 실제 데이터 노출 없이 메시지만 포함된 Map 반환
                Map<String, Object> masked = new HashMap<>();
                masked.put("message", "비공개된 게시물입니다");
                return masked;
            }
        }

        // 권한이 있는 경우 전체 데이터 반환 (DTO -> Map 변환)
        Map<String, Object> result = new HashMap<>();
        result.put("complaintNo", c.getComplaintNo());
        result.put("seqNo", c.getSeqNo());
        result.put("title", c.getTitle());
        result.put("content", c.getContent());
        result.put("category", c.getCategory());
        result.put("status", c.getStatus());
        result.put("createdDate", c.getCreatedDate());
        result.put("updatedDate", c.getUpdatedDate());
        result.put("completedDate", c.getCompletedDate());
        result.put("isPublic", c.getIsPublic());
        result.put("regionName", c.getRegionName());
        result.put("agencyName", c.getAgencyName());
        result.put("authorName", c.getAuthorName() != null ? c.getAuthorName() : "익명");
        result.put("answer", c.getAnswer());
        result.put("assignedAgencyText", c.getAssignedAgencyText());
        result.put("myReaction", c.getMyReaction());
        result.put("isMyPost", c.getIsMyPost());
        result.put("isAssignedToMe", c.getIsAssignedToMe()); // Frontend Logic Key
        result.put("assignedAgencyNos", c.getAssignedAgencyNos()); // For Debug
        result.put("likeCount", c.getLikeCount());
        result.put("dislikeCount", c.getDislikeCount());
        result.put("imagePath", c.getImagePath());
        result.put("address", c.getAddress());
        result.put("latitude", c.getLatitude());
        result.put("longitude", c.getLongitude());
        result.put("analysisResult", c.getAnalysisResult());

        return result;
    }

    @Override
    @Transactional
    public void deleteComplaint(Long complaintNo, Long userNo, String role, Long agencyNo) {
        // 1. 권한 체크: AGENCY 만 가능
        if (role == null || !role.equals("AGENCY")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "삭제 권한이 없습니다. (기관 담당자만 가능)");
        }

        // 2. 민원 존재 확인
        ComplaintDTO c = complaintMapper.findByComplaintNo(complaintNo, userNo, agencyNo)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "민원을 찾을 수 없습니다."));

        // 3. 담당 기관 체크 (isAssignedToMe 활용)
        // findByComplaintNo 호출 시 agencyNo를 넘기면 isAssignedToMe가 계산됨
        if (Boolean.FALSE.equals(c.getIsAssignedToMe())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "타 기관 소관의 민원은 삭제할 수 없습니다.");
        }

        // 4. Soft Delete 수행
        complaintMapper.updateStatus(complaintNo, ComplaintStatus.DELETED.name());
        log.info("민원 삭제 처리 완료 (Soft Delete) - ID: {}, User: {}, Agency: {}", complaintNo, userNo, agencyNo);
    }

    private final com.safeguard.service.NotificationService notificationService;

    // ... (Constructor injection handled by @RequiredArgsConstructor)

    /**
     * 민원 상태 변경 (AGENCY 권한 필수)
     */
    @Override
    @Transactional
    public void updateComplaintStatus(Long complaintNo, Long userNo, String role, Long agencyNo, String status) {
        // 1. Role Check
        if (role == null || !role.equals("AGENCY")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "권한이 없습니다 (기관 담당자 전용)");
        }

        // 2. Load Complaint
        com.safeguard.dto.ComplaintDTO c = complaintMapper.findByComplaintNo(complaintNo, userNo, agencyNo)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Complaint not found"));

        // 3. Permission Check (Java Logic)
        java.util.List<Long> assignedAgencyNos = c.getAssignedAgencyNos();
        if (agencyNo == null || !assignedAgencyNos.contains(agencyNo)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "담당 민원이 아닙니다. (MyAgency=" + agencyNo + ")");
        }

        // 4. Update
        complaintMapper.updateStatus(complaintNo, status);
        log.info("민원 상태 변경(Service) - ID: {}, Status: {}, By: {}", complaintNo, status, userNo);

        // 5. Notification Trigger (Non-blocking)
        if (c.getUserNo() != null) {
            try {
                notificationService.createNotification(
                        c.getUserNo(),
                        complaintNo,
                        "STATUS_CHANGED",
                        "STATUS_CHANGED: " + status);
            } catch (Exception e) {
                log.error("알림 생성 실패 (민원 상태 변경): {}", e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void updateComplaintAnswer(Long complaintNo, Long userNo, String role, Long agencyNo, String answer) {
        // 1. Role Check
        if (role == null || !role.equals("AGENCY")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "권한이 없습니다 (기관 담당자 전용)");
        }

        // 2. Load Complaint
        com.safeguard.dto.ComplaintDTO c = complaintMapper.findByComplaintNo(complaintNo, userNo, agencyNo)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Complaint not found"));

        // 3. Permission Check
        java.util.List<Long> assignedAgencyNos = c.getAssignedAgencyNos();
        if (agencyNo == null || !assignedAgencyNos.contains(agencyNo)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "담당 민원이 아닙니다. (MyAgency=" + agencyNo + ")");
        }

        // Check if create or update
        boolean isUpdate = (c.getAnswer() != null && !c.getAnswer().isEmpty());
        String notifType = isUpdate ? "ANSWER_UPDATED" : "ANSWER_CREATED";

        // 4. Update
        complaintMapper.updateAnswer(complaintNo, answer);
        log.info("민원 답변 등록(Service) - ID: {}, By: {}", complaintNo, userNo);

        // 5. Notification Trigger (Non-blocking)
        if (c.getUserNo() != null) {
            try {
                notificationService.createNotification(
                        c.getUserNo(),
                        complaintNo,
                        notifType,
                        notifType // Message is same as type key for this logic
                );
            } catch (Exception e) {
                log.error("알림 생성 실패 (민원 답변 등록): {}", e.getMessage());
            }
        }
    }
}
