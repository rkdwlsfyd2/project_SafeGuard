package com.safeguard.dto;

import lombok.Data;

@Data
public class ComplaintStatsDTO {
    private long total;
    private long today;
    private long received;
    private long processing;
    private long completed;
    private double slaCompliance;
}
