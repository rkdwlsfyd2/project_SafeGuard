package com.civilcomplaint.service;

import com.civilcomplaint.dto.request.ComplaintRequest;
import com.civilcomplaint.entity.*;
import com.civilcomplaint.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplaintService {
    private final ComplaintMapper complaintMapper;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getComplaints(Long userNo) {
        List<Complaint> complaints = complaintMapper.findAll();
        return complaints.stream()
                .map(c -> {
                    String authorName = userMapper.findByUserNo(c.getUserNo())
                            .map(AppUser::getName).orElse("Unknown");
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", c.getComplaintNo());
                    m.put("title", c.getTitle());
                    m.put("category", c.getCategory());
                    m.put("status", c.getStatus());
                    m.put("createdAt", c.getCreatedDate() != null ? c.getCreatedDate().toString() : null);
                    m.put("authorName", authorName);
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getComplaintDetail(Long complaintNo, Long userNo) {
        Complaint c = complaintMapper.findByComplaintNo(complaintNo)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        String authorName = userMapper.findByUserNo(c.getUserNo()).map(AppUser::getName).orElse("Unknown");

        Map<String, Object> result = new HashMap<>();
        result.put("id", c.getComplaintNo());
        result.put("title", c.getTitle());
        result.put("content", c.getContent());
        result.put("category", c.getCategory());
        result.put("status", c.getStatus());
        result.put("createdAt", c.getCreatedDate() != null ? c.getCreatedDate().toString() : null);
        result.put("authorName", authorName);
        return result;
    }

    @Transactional
    public Map<String, Object> createComplaint(ComplaintRequest request, Long userNo) {
        Complaint c = new Complaint();
        c.setTitle(request.getTitle());
        c.setContent(request.getDescription());
        c.setAddress(request.getAddress());
        c.setLatitude(request.getLatitude());
        c.setLongitude(request.getLongitude());
        c.setImagePath(request.getImagePath());
        c.setAnalysisResult(request.getAnalysisResult());
        c.setCategory(request.getCategory());
        c.setUserNo(userNo);
        c.setStatus(com.civilcomplaint.enums.ComplaintStatus.PENDING);
        complaintMapper.insert(c);
        log.info("[Complaints] Created: #{} by userNo {}", c.getComplaintNo(), userNo);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Complaint submitted");
        result.put("id", c.getComplaintNo());
        return result;
    }

    @Transactional
    public Map<String, Object> updateComplaint(Long complaintNo, ComplaintRequest request, Long userNo) {
        Complaint c = complaintMapper.findByComplaintNo(complaintNo)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        if (!c.getUserNo().equals(userNo))
            throw new RuntimeException("Not authorized");

        if (request.getDescription() != null)
            c.setContent(request.getDescription());
        if (request.getTitle() != null)
            c.setTitle(request.getTitle());
        if (request.getStatus() != null)
            c.setStatus(com.civilcomplaint.enums.ComplaintStatus.valueOf(request.getStatus()));
        complaintMapper.update(c);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Complaint updated");
        return result;
    }

    @Transactional
    public Map<String, Object> deleteComplaint(Long complaintNo, Long userNo, String role) {
        Complaint c = complaintMapper.findByComplaintNo(complaintNo)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        if (!c.getUserNo().equals(userNo) && "USER".equals(role))
            throw new RuntimeException("Not authorized");
        complaintMapper.deleteByComplaintNo(complaintNo);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Complaint deleted");
        return result;
    }
}
