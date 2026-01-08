package com.safeguard.service;

import com.safeguard.dto.SttResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
public class SttService {

    @Value("${ai.stt.url}")
    private String sttUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public SttResponse transcribe(MultipartFile file) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", file.getResource());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            log.info("Sending STT request to: {}", sttUrl + "/upload_voice");
            return restTemplate.postForObject(sttUrl + "/upload_voice", requestEntity, SttResponse.class);
        } catch (Exception e) {
            log.error("STT Service error: {}", e.getMessage());
            throw new RuntimeException("음성 인식 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
}
