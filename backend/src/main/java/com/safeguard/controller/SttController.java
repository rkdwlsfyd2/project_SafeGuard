package com.safeguard.controller;

import com.safeguard.dto.SttResponse;
import com.safeguard.service.SttService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/stt")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class SttController {

    private final SttService sttService;

    @PostMapping("/transcribe")
    public ResponseEntity<SttResponse> transcribe(@RequestParam("file") MultipartFile file) {
        log.info("Received STT request for file: {}", file.getOriginalFilename());
        SttResponse response = sttService.transcribe(file);
        return ResponseEntity.ok(response);
    }
}
