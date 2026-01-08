package com.safeguard.service;

import com.safeguard.dto.RagAnalysisRequest;
import com.safeguard.dto.RagAnalysisResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

// RagService.java : RAG 분석을 위한 서비스 클래스 
@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {

    @Value("${ai.rag.url}")
    private String aiRagUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public RagAnalysisResponse analyzeText(String text) {
        String url = aiRagUrl + "/classify";
        RagAnalysisRequest request = new RagAnalysisRequest(text);

        try {
            log.info("[RAG Service] Requesting analysis for text: {}", text);
            RagAnalysisResponse response = restTemplate.postForObject(url, request, RagAnalysisResponse.class);
            log.info("[RAG Service] Received result: {}", response);
            return response;
        } catch (Exception e) {
            log.error("[RAG Service] Connection failed to: {}", url, e);
            throw new RuntimeException("AI RAG 서비스 연결에 실패했습니다.");
        }
    }
}
