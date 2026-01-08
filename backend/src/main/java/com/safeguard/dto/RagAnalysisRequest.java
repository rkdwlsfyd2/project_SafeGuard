// RagAnalysisRequest.java : 사용자의 질문 텍스트를 전달하는 전용 요청 객체 
package com.safeguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagAnalysisRequest {
    private String text;
}
