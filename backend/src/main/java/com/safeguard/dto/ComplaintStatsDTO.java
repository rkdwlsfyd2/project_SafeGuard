package com.safeguard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * 대시보드 통계 데이터 전송 객체 (DTO)
 * 
 * 주요 기능:
 * 1. 전체 민원 현황 (접수, 처리중, 완료, SLA 준수율 등)
 * 2. Summary Bar용 기간별(일/월/년) 비교 통계 데이터
 * 3. 추가 KPI 지표 (평균 처리일, 완료율, 장기 미처리율 등)
 */
@Data
public class ComplaintStatsDTO {
    private long total;
    private long today;
    private long received;
    private long processing;
    private long completed;
    @JsonProperty("sla_compliance")
    private double slaCompliance;
    private long overdue;

    // [Summary Bar] 기간별 접수 건수 및 증감율 계산을 위한 기초 데이터
    // 전일/전월/전년 대비 증감율은 프론트엔드에서 (X - Y) / Y 공식으로 산출됨
    private long todayCount;
    private long yesterdayCount;
    private long monthCount;
    private long lastMonthCount;
    private long yearCount;
    private long lastYearCount;

    // 도로 상세 분석 KPI용 추가
    @JsonProperty("avg_processing_days")
    private double avgProcessingDays;
    @JsonProperty("completion_rate")
    private double completionRate;
    @JsonProperty("safety_risk_rate")
    private double safetyRiskRate;
    @JsonProperty("long_term_unprocessed_rate")
    private double longTermUnprocessedRate;
}
