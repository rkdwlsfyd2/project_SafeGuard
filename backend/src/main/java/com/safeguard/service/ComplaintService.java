package com.safeguard.service;

import java.util.Map;

public interface ComplaintService {
    Long createComplaint(Map<String, Object> data, org.springframework.web.multipart.MultipartFile file, Long userNo);
}
