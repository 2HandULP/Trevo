package pt.trevo.trevo_api.dto;

import java.util.List;

public record NotificationsResponse(
    long unreadCount,
    List<NotificationResponse> notifications
) {
}
