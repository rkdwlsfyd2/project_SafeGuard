package com.civilcomplaint.controller;

import com.civilcomplaint.service.ImageAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ImageAnalysisController {
    private final ImageAnalysisService imageAnalysisService;

    @PostMapping("/analyze-image")
    public ResponseEntity<Map<String, Object>> analyze(@RequestParam("image") MultipartFile file) {
        try {
            return ResponseEntity.ok(imageAnalysisService.analyzeImage(file));
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
