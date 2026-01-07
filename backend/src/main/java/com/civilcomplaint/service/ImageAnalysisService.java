package com.civilcomplaint.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImageAnalysisService {
    @Value("${file.upload-dir}")
    private String uploadDir;
    private final ObjectMapper objectMapper;

    public Map<String, Object> analyzeImage(MultipartFile file) throws IOException, InterruptedException {
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath))
            Files.createDirectories(uploadPath);
        String filename = System.currentTimeMillis() + "-" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath);
        log.info("[Server] Image received: {}", filePath);

        String pythonCmd = System.getProperty("os.name").toLowerCase().contains("win") ? "py" : "python";
        String scriptPath = Paths.get("../server/analyze_image.py").toAbsolutePath().normalize().toString();
        ProcessBuilder pb = new ProcessBuilder(pythonCmd, scriptPath, filePath.toString());
        Process process = pb.start();

        StringBuilder resultData = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null)
                resultData.append(line);
        }
        process.waitFor(60, TimeUnit.SECONDS);
        if (process.exitValue() != 0)
            throw new RuntimeException("AI analysis failed");

        String result = resultData.toString();
        int start = result.indexOf("{"), end = result.lastIndexOf("}");
        if (start == -1 || end == -1)
            throw new RuntimeException("Invalid JSON result");

        JsonNode jsonNode = objectMapper.readTree(result.substring(start, end + 1));
        Map<String, Object> response = objectMapper.convertValue(jsonNode, Map.class);
        response.put("imagePath", "/uploads/" + filename);
        response.put("message", "Analysis complete");
        log.info("[Server] Analysis success");
        return response;
    }
}
