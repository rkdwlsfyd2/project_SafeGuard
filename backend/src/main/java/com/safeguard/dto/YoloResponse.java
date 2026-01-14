package com.safeguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YoloResponse {
    private String type;    // 분석 유형 (한글)
    private String agency;  // 담당 기관 (한글)
    private String message; // 메시지 (성공/실패)
}
