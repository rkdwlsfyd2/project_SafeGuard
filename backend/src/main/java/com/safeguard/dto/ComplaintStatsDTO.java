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
}
