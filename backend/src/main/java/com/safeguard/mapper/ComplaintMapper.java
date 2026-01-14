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
    List<ComplaintDTO> selectComplaintList(@Param("search") String search,
            @Param("category") String category,
            @Param("status") String status,
            @Param("region") String region,
            @Param("sort") String sort,
            @Param("order") String order,
            @Param("agencyNo") Long agencyNo);

    List<ComplaintDTO> findAll(Map<String, Object> params);

    long countAll(Map<String, Object> params);

    ComplaintStatsDTO selectComplaintStats(@Param("agencyNo") Long agencyNo);

    List<ComplaintDTO> selectTopLikedComplaints(@Param("status") String status, @Param("agencyNo") Long agencyNo);

    boolean isLikedByUser(@Param("complaintNo") Long complaintNo, @Param("userNo") Long userNo);

    Optional<ComplaintDTO> findByComplaintNo(@Param("complaintNo") Long complaintNo);

    void insertComplaintDto(ComplaintDTO complaint);

    void updateComplaint(ComplaintDTO complaint);

    void updateStatus(@Param("complaintNo") Long complaintNo, @Param("status") String status);

    void updateAnswer(@Param("complaintNo") Long complaintNo, @Param("answer") String answer);

    void deleteComplaintByNo(@Param("complaintNo") Long complaintNo);

    void updateLikeCount(@Param("complaintNo") Long complaintNo);

    int checkUserLike(@Param("complaintNo") Long complaintNo, @Param("userNo") Long userNo);

    void insertLike(@Param("complaintNo") Long complaintNo, @Param("userNo") Long userNo);

    void deleteLike(@Param("complaintNo") Long complaintNo, @Param("userNo") Long userNo);

    void decreaseLikeCount(@Param("complaintNo") Long complaintNo);

    void deleteAllLikes();

    void deleteAllComplaints();

    // From origin/main
    void insertComplaint(Complaint complaint);

    void insertSpatialFeature(SpatialFeature spatialFeature);

    void insertComplaintAgency(@Param("complaintNo") Long complaintNo, @Param("agencyNo") Long agencyNo);

    /**
     * 사용자가 작성한 민원 목록 조회 (마이페이지용)
     * 
     * @param params userNo 포함 파라미터 Map
     * @return ComplaintDTO 리스트
     */
    List<ComplaintDTO> selectComplaintListByUserNo(Map<String, Object> params);

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
    List<Map<String, Object>> selectMonthlyTrend(@Param("category") String category);

    /**
     * 기관별(자치구별) 미처리 민원 병목 현황 조회
     * 
     * @return 자치구별 미처리 건수 상위 10개
     */
    List<Map<String, Object>> selectAgencyBottleneck();

    /**
     * 자치구별 3일 이상 지연된 민원 현황 조회
     * 
     * @return 자치구별 지연 건수 상위 10개
     */
    List<Map<String, Object>> selectDistrictOverdue();

    /**
     * 연령대별 민원 접수 통계 조회
     * 
     * @return 연령대별 건수 리스트
     */
    List<Map<String, Object>> selectAgeGroupStats();

    /**
     * 3일 이상 지연된 실시간 민원 목록 조회
     * 
     * @return 지연 민원 상세 정보 리스트
     */
    List<Map<String, Object>> selectOverdueComplaintList();
}
