package pt.trevo.trevo_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import pt.trevo.trevo_api.BaseUnitTest;
import pt.trevo.trevo_api.dto.NotificationsResponse;
import pt.trevo.trevo_api.persistence.entity.AppNotification;
import pt.trevo.trevo_api.persistence.entity.NotificationType;
import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.entity.PaymentMethod;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.NotificationRepository;

class NotificationServiceTest extends BaseUnitTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Test
    void createNewOrderNotificationPersistsUnreadRecordForShopOwner() {
        NotificationService notificationService = new NotificationService(notificationRepository);
        User owner = User.builder().id(901L).build();
        Shop shop = Shop.builder().id(301L).owner(owner).name("North Shop").build();
        Order order = order(77L, shop);

        when(notificationRepository.save(org.mockito.ArgumentMatchers.any(AppNotification.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        notificationService.createNewOrderNotification(order);

        ArgumentCaptor<AppNotification> notificationCaptor = ArgumentCaptor.forClass(AppNotification.class);
        verify(notificationRepository).save(notificationCaptor.capture());

        AppNotification notification = notificationCaptor.getValue();
        assertThat(notification.getRecipient()).isSameAs(owner);
        assertThat(notification.getOrder()).isSameAs(order);
        assertThat(notification.getType()).isEqualTo(NotificationType.NEW_ORDER);
        assertThat(notification.getTitle()).isEqualTo("Nova encomenda recebida");
        assertThat(notification.getMessage()).contains("North Shop");
        assertThat(notification.getReadAt()).isNull();
        assertThat(notification.getCreatedAt()).isNotNull();
    }

    @Test
    void getNotificationsReturnsUnreadCountAndNewestFirstList() {
        NotificationService notificationService = new NotificationService(notificationRepository);
        Long recipientId = 901L;
        Order order = order(77L, Shop.builder().id(301L).owner(User.builder().id(recipientId).build()).name("North Shop").build());
        AppNotification unread = notification(1L, order, null, Instant.parse("2026-05-08T10:00:00Z"));
        AppNotification read = notification(2L, order, Instant.parse("2026-05-08T11:00:00Z"), Instant.parse("2026-05-08T09:00:00Z"));

        when(notificationRepository.countByRecipientIdAndReadAtIsNull(recipientId)).thenReturn(1L);
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId)).thenReturn(List.of(unread, read));

        NotificationsResponse response = notificationService.getNotifications(recipientId);

        assertThat(response.unreadCount()).isEqualTo(1);
        assertThat(response.notifications()).hasSize(2);
        assertThat(response.notifications().get(0).id()).isEqualTo(1L);
        assertThat(response.notifications().get(0).orderId()).isEqualTo(77L);
        assertThat(response.notifications().get(0).type()).isEqualTo("NEW_ORDER");
        assertThat(response.notifications().get(0).read()).isFalse();
        assertThat(response.notifications().get(1).read()).isTrue();
    }

    private AppNotification notification(Long id, Order order, Instant readAt, Instant createdAt) {
        AppNotification notification = new AppNotification();
        notification.setId(id);
        notification.setRecipient(order.getShop().getOwner());
        notification.setOrder(order);
        notification.setType(NotificationType.NEW_ORDER);
        notification.setTitle("Nova encomenda recebida");
        notification.setMessage("Recebeste uma nova encomenda na loja " + order.getShop().getName() + ".");
        notification.setReadAt(readAt);
        notification.setCreatedAt(createdAt);
        return notification;
    }

    private Order order(Long id, Shop shop) {
        Order order = new Order();
        order.setId(id);
        order.setBuyer(User.builder().id(10L).build());
        order.setShop(shop);
        order.setStatus(OrderStatus.PLACED);
        order.setPaymentMethod(PaymentMethod.MBWAY);
        order.setTotalAmount(BigDecimal.TEN);
        order.setCommissionAmount(BigDecimal.ONE);
        order.setCreatedAt(Instant.now());
        return order;
    }
}
