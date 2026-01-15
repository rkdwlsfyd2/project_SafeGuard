package com.safeguard.service;

import java.util.Map;

public interface ComplaintService {
    /**
     * 민원을 생성하고 관련 공간 정보 및 기관 매핑을 저장한다.
     * (한글 기능 설명: 인공지능 분석 결과 및 위치 기반 자동 기관 할당 포함)
     */
    Long createComplaint(Map<String, Object> data, org.springframework.web.multipart.MultipartFile file, Long userNo);

    /**
     * 민원 삭제 (Soft Delete)
     * - AGENCY 권한 및 당당 기관 일치 여부 확인 필수
     */
    void deleteComplaint(Long complaintNo, Long userNo, String role, Long agencyNo);

    /**
     * 대시보드용 각종 통계 데이터를 조회한다.
     * (한글 기능 설명: 요약 통계, 카테고리 분포, 월별 트렌드, 기관별 병목, 지연 민원 등 포함)
     * 
     * @param agencyNo 특정 기관 필터링 시 사용 (null 가능)
     * @param category 카테고리 필터링 시 사용 (null 가능)
     * @return 통계 데이터 맵
     */
    java.util.Map<String, Object> getDashboardStats(Long agencyNo, String category, String timeBasis);

    /**
     * 민원 상세 조회 (접근 권한 엄격 제어)
     */
    java.util.Map<String, Object> getComplaintDetail(Long complaintNo, Long userNo, String role, Long agencyNo);
}
