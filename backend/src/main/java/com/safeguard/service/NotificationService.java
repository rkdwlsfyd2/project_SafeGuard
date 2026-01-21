package com.safeguard.service;

import com.safeguard.dto.NotificationDTO;
import com.safeguard.mapper.NotificationMapper;
import com.safeguard.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationMapper notificationMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final com.safeguard.mapper.UserMapper userMapper;

    // Use ConcurrentHashMap to manage emitters for each user
    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    // Subscribe to SSE
    public SseEmitter subscribe(String token) {
        if (!jwtTokenProvider.validateToken(token)) {
            throw new IllegalArgumentException("Invalid Token");
        }

        String userIdStr = jwtTokenProvider.getUsername(token); // This returns 'sub' claim which is username (String)

        Long userNo;
        try {
            userNo = Long.parseLong(userIdStr);
        } catch (NumberFormatException e) {
            // Fallback: If subject is not numeric, look up by userId (username)
            userNo = userMapper.findByUserId(userIdStr)
                    .map(com.safeguard.dto.UserDTO::getUserNo)
                    .orElseThrow(() -> {
                        log.error("User not found for token subject: {}", userIdStr);
                        return new IllegalArgumentException("User not found");
                    });
        }

        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L); // 1 hour timeout

        final Long finalUserNo = userNo;
        final SseEmitter finalEmitter = emitter;

        List<SseEmitter> userEmitters = emitters.computeIfAbsent(finalUserNo, k -> new ArrayList<>());
        synchronized (userEmitters) {
            userEmitters.add(finalEmitter);
        }

        finalEmitter.onCompletion(() -> removeEmitter(finalUserNo, finalEmitter));
        finalEmitter.onTimeout(() -> {
            finalEmitter.complete();
            removeEmitter(finalUserNo, finalEmitter);
        });
        finalEmitter.onError((e) -> removeEmitter(finalUserNo, finalEmitter));

        // Send initial dummy event to establish connection
        try {
            finalEmitter.send(SseEmitter.event().name("connect").data("connected"));
        } catch (IOException e) {
            removeEmitter(finalUserNo, finalEmitter);
        }

        return finalEmitter;
    }

    private void removeEmitter(Long userNo, SseEmitter emitter) {
        List<SseEmitter> userEmitters = emitters.get(userNo);
        if (userEmitters != null) {
            synchronized (userEmitters) {
                userEmitters.remove(emitter);
                if (userEmitters.isEmpty()) {
                    emitters.remove(userNo);
                }
            }
        }
    }

    // Create & Publish Notification
    public void createNotification(Long userNo, Long complaintNo, String type, String message) {
        String dtoType = mapToDtoType(type);

        NotificationDTO dto = NotificationDTO.builder()
                .userNo(userNo)
                .complaintNo(complaintNo)
                .type(dtoType) // Mapped type for Frontend
                .message(message) // Raw code message "STATUS_CHANGED: UNPROCESSED"
                .isRead(false)
                .build();

        // 1. DB Insert
        dto.setType(type); // Set raw type for DB insert
        notificationMapper.insertNotification(dto);

        // 2. Prepare for SSE (transform type)
        dto.setType(dtoType);

        // 3. Publish
        sendToUser(userNo, dto);
    }

    private String mapToDtoType(String rawType) {
        if ("STATUS_CHANGED".equals(rawType))
            return "STATUS";
        if ("ANSWER_CREATED".equals(rawType) || "ANSWER_UPDATED".equals(rawType))
            return "ANSWER";
        if ("MANAGER_ASSIGNED".equals(rawType))
            return "MANAGER";
        return "ANSWER"; // Fallback as requested
    }

    private void sendToUser(Long userNo, NotificationDTO dto) {
        List<SseEmitter> userEmitters = emitters.get(userNo);
        if (userEmitters != null) {
            synchronized (userEmitters) {
                List<SseEmitter> deadEmitters = new ArrayList<>();
                for (SseEmitter emitter : userEmitters) {
                    try {
                        emitter.send(SseEmitter.event().name("notification").data(dto));
                    } catch (IOException e) {
                        deadEmitters.add(emitter);
                    }
                }
                userEmitters.removeAll(deadEmitters);
            }
        }
    }

    public Map<String, Object> getNotifications(Long userNo) {
        List<NotificationDTO> list = notificationMapper.selectNotificationsByUser(userNo);

        // Transform types for Frontend logic
        for (NotificationDTO n : list) {
            n.setType(mapToDtoType(n.getType()));
        }

        int unread = notificationMapper.countUnread(userNo);
        return Map.of("notifications", list, "unreadCount", unread);
    }

    public void markAsRead(Long notificationId, Long userNo) {
        notificationMapper.markAsRead(notificationId, userNo);
    }
}
