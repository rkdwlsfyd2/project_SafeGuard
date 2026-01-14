package com.safeguard.service;

import com.safeguard.dto.YoloResponse;
import org.springframework.web.multipart.MultipartFile;

public interface YoloService {
    YoloResponse analyzeImage(MultipartFile file);
}
