package com.safeguard.service.impl;

import com.safeguard.dto.YoloResponse;
import com.safeguard.service.YoloService;
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

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class YoloServiceImpl implements YoloService {

    @Value("${ai.yolo.url}")
    private String yoloUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // 영문 라벨 -> 한글 라벨 매핑 (AI 서버가 영문을 반환할 경우 대비)
    private static final Map<String, String> TYPE_MAP = new HashMap<>();
    private static final Map<String, String> AGENCY_MAP = new HashMap<>();

    static {
        // 사용자 고정 매핑 정보 (0~4 순서)
        TYPE_MAP.put("0", "보행 방해물");
        TYPE_MAP.put("1", "불법 현수막");
        TYPE_MAP.put("2", "불법 주정차");
        TYPE_MAP.put("3", "공사 현장");
        TYPE_MAP.put("4", "쓰레기 무단 투기");

        // 영문 라벨 대응 (추가 안전망)
        TYPE_MAP.put("pothole", "보행 방해물(도로파손)");
        TYPE_MAP.put("banner", "불법 현수막");
        TYPE_MAP.put("parking", "불법 주정차");
        TYPE_MAP.put("construction", "공사 현장");
        TYPE_MAP.put("trash", "쓰레기 무단 투기");
        
        // 기관 매핑
        AGENCY_MAP.put("도로", "국토교통부");
        AGENCY_MAP.put("행정·안전", "행정안전부");
        AGENCY_MAP.put("교통", "경찰청");
        AGENCY_MAP.put("주택·건축", "행정안전부");
        AGENCY_MAP.put("환경", "기후에너지환경부");
    }

    @Override
    public YoloResponse analyzeImage(MultipartFile file) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", file.getResource());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            String url = yoloUrl + "/api/analyze-image";
            log.info("[Yolo Service] AI 분석 요청: {}", url);

            Map<String, Object> aiResult = restTemplate.postForObject(url, requestEntity, Map.class);
            log.info("[Yolo Service] AI 분석 응답: {}", aiResult);

            if (aiResult == null) {
                throw new RuntimeException("AI 서버로부터 응답을 받지 못했습니다.");
            }

            // AI 서버가 'type' 필드에 라벨 이름이나 ID를 보낸다고 가정
            String typeRaw = String.valueOf(aiResult.getOrDefault("type", ""));
            String agencyRaw = (String) aiResult.getOrDefault("agency", "지자체 민원실");

            // 1. 유형 한글화 (매핑 테이블 우선 확인)
            String localizedType = TYPE_MAP.getOrDefault(typeRaw.toLowerCase(), typeRaw);
            
            // 2. 기관 한글화 (한글화된 유형을 기준으로 재매핑)
            String localizedAgency = AGENCY_MAP.getOrDefault(localizedType, agencyRaw);

            return YoloResponse.builder()
                    .type(localizedType)
                    .agency(localizedAgency)
                    .message("분석 성공")
                    .build();

        } catch (Exception e) {
            log.error("[Yolo Service] 오류: {}", e.getMessage());
            return YoloResponse.builder()
                    .type("분석 실패")
                    .agency("-")
                    .message("AI 분석 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }
}
