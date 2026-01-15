package com.safeguard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

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
