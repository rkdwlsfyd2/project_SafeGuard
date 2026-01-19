package com.safeguard.mapper;

import com.safeguard.dto.ComplaintDTO;
import com.safeguard.dto.ComplaintStatsDTO;
import com.safeguard.entity.Complaint;
import com.safeguard.entity.SpatialFeature;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Mapper
public interface ComplaintMapper {

        // =========================
        // 목록/검색/페이징
        // =========================
        List<ComplaintDTO> selectComplaintList(@Param("search") String search,
                        @Param("category") String category,
                        @Param("status") String status,
                        @Param("region") String region,
                        @Param("sort") String sort,
                        @Param("order") String order,
                        @Param("agencyNo") Long agencyNo);

        List<ComplaintDTO> findAll(Map<String, Object> params);

        long countAll(Map<String, Object> params);

        // =========================
        // 상세/통계/Top
        // =========================
        ComplaintStatsDTO selectComplaintStats(@Param("agencyNo") Long agencyNo, @Param("category") String category);

        List<ComplaintDTO> selectTopLikedComplaints(@Param("status") String status,
                        @Param("agencyNo") Long agencyNo);

        boolean isLikedByUser(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo);

        /**
         * 상세 조회 (내 반응/내 글 여부 포함을 위해 userNo 파라미터 유지)
         */
        Optional<ComplaintDTO> findByComplaintNo(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo,
                        @Param("viewerAgencyNo") Long viewerAgencyNo);

        // =========================
        // CUD
        // =========================
        void insertComplaintDto(ComplaintDTO complaint);

        void updateComplaint(ComplaintDTO complaint);

        void updateStatus(@Param("complaintNo") Long complaintNo,
                        @Param("status") String status);

        void updateAnswer(@Param("complaintNo") Long complaintNo,
                        @Param("answer") String answer);

        void deleteComplaintByNo(@Param("complaintNo") Long complaintNo);

        // =========================
        // (구) like 테이블 기반 메서드 (기존 코드 호환용)
        // - reaction 테이블/로직으로 완전 이관했다면 정리(삭제) 가능
        // =========================
        void updateLikeCount(@Param("complaintNo") Long complaintNo);

        int checkUserLike(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo);

        void insertLike(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo);

        void deleteLike(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo);

        void decreaseLikeCount(@Param("complaintNo") Long complaintNo);

        void deleteAllLikes();

        void deleteAllComplaints();

        void deleteByUserNo(@Param("userNo") Long userNo);

        // =========================
        // origin/main (등록 플로우)
        // =========================
        void insertComplaint(Complaint complaint);

        void insertSpatialFeature(SpatialFeature spatialFeature);

        void insertComplaintAgency(@Param("complaintNo") Long complaintNo,
                        @Param("agencyNo") Long agencyNo);

        /**
         * 사용자가 작성한 민원 목록 조회 (마이페이지용)
         *
         * @param params userNo 포함 파라미터 Map
         * @return ComplaintDTO 리스트
         */
        List<ComplaintDTO> selectComplaintListByUserNo(Map<String, Object> params);

        // =========================
        // Reaction (LIKE/DISLIKE) - feature/agency-admin-fix 채택
        // =========================
        String findReactionByUser(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo);

        void insertReaction(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo,
                        @Param("type") String type);

        void updateReaction(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo,
                        @Param("type") String type);

        void deleteReaction(@Param("complaintNo") Long complaintNo,
                        @Param("userNo") Long userNo);

        /**
         * 민원 테이블의 like_count/dislike_count 등 집계 갱신용
         * (구현 SQL에 맞춰 사용)
         */
        void updateComplaintLikeCount(@Param("complaintNo") Long complaintNo);

        /**
         * 상태별 민원 건수 집계 (기관 필터링 가능)
         */
        List<Map<String, Object>> selectComplaintStatusCounts(@Param("agencyNo") Long agencyNo);

        // =========================
        // 대시보드/분석 쿼리 - main 채택 (기존 대시보드 기능 유지)
        // =========================

        /**
         * 카테고리별 민원 통계 조회
         *
         * @param agencyNo 기관 번호 (필터링용, null 가능)
         * @return 카테고리명과 건수 리스트
         */
        List<Map<String, Object>> selectCategoryStats(@Param("agencyNo") Long agencyNo);

        /**
         * 월별 민원 트렌드 조회
         *
         * @param category 카테고리 필터 (null 가능)
         * @return 월별 접수/완료 건수 리스트
         */
        List<Map<String, Object>> selectMonthlyTrend(@Param("category") String category,
                        @Param("timeBasis") String timeBasis, @Param("agencyNo") Long agencyNo);

        /**
         * 기관별(자치구별) 미처리 민원 병목 현황 조회
         *
         * @return 자치구별 미처리 건수 상위 10개
         */
        List<Map<String, Object>> selectAgencyBottleneck(@Param("agencyNo") Long agencyNo);

        /**
         * 자치구별 3일 이상 지연된 민원 현황 조회
         *
         * @return 자치구별 지연 건수 상위 10개
         */
        List<Map<String, Object>> selectDistrictOverdue(@Param("agencyNo") Long agencyNo);

        /**
         * 연령대별 민원 접수 통계 조회
         *
         * @return 연령대별 건수 리스트
         */
        List<Map<String, Object>> selectAgeGroupStats(@Param("agencyNo") Long agencyNo);

        /**
         * 3일 이상 지연된 실시간 민원 목록 조회
         *
         * @return 지연 민원 상세 정보 리스트
         */
        List<Map<String, Object>> selectOverdueComplaintList(@Param("agencyNo") Long agencyNo);
}
