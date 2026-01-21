package com.safeguard.mapper;

import com.safeguard.dto.NotificationDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface NotificationMapper {
    void insertNotification(NotificationDTO notification);

    List<NotificationDTO> selectNotificationsByUser(@Param("userNo") Long userNo);

    int countUnread(@Param("userNo") Long userNo);

    void markAsRead(@Param("notificationId") Long notificationId, @Param("userNo") Long userNo);
}
