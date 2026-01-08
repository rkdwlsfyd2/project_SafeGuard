package com.safeguard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// RagAnalysisResponse.java : RAG 분석 결과를 전달하는 전용 응답 객체 
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagAnalysisResponse {
    @JsonProperty("agency_code")
    private Integer agencyCode;

    @JsonProperty("agency_name")
    private String agencyName;

    private String category;

    private Double confidence;

    private String reasoning;

    private List<String> sources;

    private String message;
}
