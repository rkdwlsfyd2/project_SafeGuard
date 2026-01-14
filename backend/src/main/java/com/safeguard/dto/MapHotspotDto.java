package com.safeguard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MapHotspotDto {
    private String cellId;
    private Integer count;
    private List<PointDto> points;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PointDto {
        private Double lat;
        private Double lng;
    }
}
