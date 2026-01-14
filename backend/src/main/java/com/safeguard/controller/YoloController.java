package com.safeguard.controller;

import com.safeguard.dto.YoloResponse;
import com.safeguard.service.YoloService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/yolo")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class YoloController {

    private final YoloService yoloService;

    @PostMapping("/analyze")
    public ResponseEntity<YoloResponse> analyzeImage(@RequestParam("image") MultipartFile image) {
        log.info("[Yolo Controller] Received image analysis request: {}", image.getOriginalFilename());
        YoloResponse response = yoloService.analyzeImage(image);
        return ResponseEntity.ok(response);
    }
}
