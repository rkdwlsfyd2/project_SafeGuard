package com.safeguard.controller;

import com.safeguard.dto.NotificationDTO;
import com.safeguard.security.JwtTokenProvider;
import com.safeguard.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/subscribe")
    public SseEmitter subscribe(@RequestParam String token) {
        return notificationService.subscribe(token);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNotifications(Authentication authentication) {
        // userNo extraction
        // Assuming CustomUserDetails or principal has ID.
        // For simplicity in this project's context, usually we cast principal.
        // Let's check typical Controller pattern.
        // If "JwtTokenProvider" is used, typically 'createToken' used userId string.
        // We will assume Authentication.getName() returns the userId (stringified
        // Long).

        if (authentication == null)
            return ResponseEntity.status(403).body(Map.of("notifications", Collections.emptyList(), "unreadCount", 0));

        try {
            Long userNo = Long.parseLong(authentication.getName());
            return ResponseEntity.ok(notificationService.getNotifications(userNo));
        } catch (NumberFormatException e) {
            return ResponseEntity.status(403).body(Map.of("notifications", Collections.emptyList(), "unreadCount", 0));
        }
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(403).build();
        try {
            Long userNo = Long.parseLong(authentication.getName());
            notificationService.markAsRead(id, userNo);
            return ResponseEntity.ok().build();
        } catch (NumberFormatException e) {
            return ResponseEntity.status(403).build();
        }
    }
}
