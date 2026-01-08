package com.safeguard.controller;

import com.safeguard.dto.RagAnalysisRequest;
import com.safeguard.dto.RagAnalysisResponse;
import com.safeguard.service.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
// RagController.java : RAG 분석을 위한 REST API 컨트롤러 

@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;

    @PostMapping("/analyze")
    public RagAnalysisResponse analyzeText(@RequestBody RagAnalysisRequest request) {
        return ragService.analyzeText(request.getText());
    }
}
