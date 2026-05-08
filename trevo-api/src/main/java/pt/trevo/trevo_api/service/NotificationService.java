package pt.trevo.trevo_api.service;

import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.trevo.trevo_api.dto.NotificationResponse;
import pt.trevo.trevo_api.dto.NotificationsResponse;
import pt.trevo.trevo_api.persistence.entity.AppNotification;
import pt.trevo.trevo_api.persistence.entity.NotificationType;
import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.repository.NotificationRepository;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public AppNotification createNewOrderNotification(Order order) {
        Shop shop = order.getShop();

        AppNotification notification = new AppNotification();
        notification.setRecipient(shop.getOwner());
        notification.setOrder(order);
        notification.setType(NotificationType.NEW_ORDER);
        notification.setTitle("Nova encomenda recebida");
        notification.setMessage("Recebeste uma nova encomenda na loja " + shop.getName() + ".");
        notification.setCreatedAt(Instant.now());

        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public NotificationsResponse getNotifications(Long recipientId) {
        long unreadCount = notificationRepository.countByRecipientIdAndReadAtIsNull(recipientId);
        List<NotificationResponse> notifications = notificationRepository
            .findByRecipientIdOrderByCreatedAtDesc(recipientId)
            .stream()
            .map(this::toResponse)
            .toList();

        return new NotificationsResponse(unreadCount, notifications);
    }

    private NotificationResponse toResponse(AppNotification notification) {
        Order order = notification.getOrder();

        return new NotificationResponse(
            notification.getId(),
            order == null ? null : order.getId(),
            notification.getType().name(),
            notification.getTitle(),
            notification.getMessage(),
            notification.getReadAt() != null,
            notification.getCreatedAt(),
            notification.getReadAt()
        );
    }
}
