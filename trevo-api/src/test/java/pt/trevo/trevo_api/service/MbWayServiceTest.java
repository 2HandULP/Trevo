package pt.trevo.trevo_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.BaseUnitTest;
import pt.trevo.trevo_api.dto.MbWayCallbackRequest;
import pt.trevo.trevo_api.dto.MbWayPaymentRequestResponse;
import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.repository.OrderRepository;

class MbWayServiceTest extends BaseUnitTest {

    @Mock
    private MbWayPaymentsClient mbWayPaymentsClient;

    @Mock
    private OrderRepository orderRepository;

    @Test
    void createPaymentRequestValidatesPhoneAndCreatesRequest() {
        MbWayService mbWayService = new MbWayService(mbWayPaymentsClient, orderRepository);
        Order order = order(77L, "19.995");

        when(mbWayPaymentsClient.createPaymentRequest(
            eq(77L),
            eq(new BigDecimal("20.00")),
            eq("EUR"),
            eq("+351923456789")
        )).thenReturn(new MbWayPaymentRequestResponse("MBWAY-REF-123", "PENDING"));
        when(orderRepository.save(order)).thenReturn(order);

        MbWayPaymentRequestResponse response = mbWayService.createPaymentRequest(order, "923 456 789");

        assertThat(response.reference()).isEqualTo("MBWAY-REF-123");
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(order.getPaymentReference()).isEqualTo("MBWAY-REF-123");
        verify(orderRepository).save(order);
    }

    @Test
    void createPaymentRequestRejectsInvalidPhoneNumber() {
        MbWayService mbWayService = new MbWayService(mbWayPaymentsClient, orderRepository);

        Throwable thrown = catchThrowable(() -> mbWayService.createPaymentRequest(order(77L, "19.99"), "812345678"));

        assertThat(thrown).isInstanceOf(ResponseStatusException.class);
        ResponseStatusException exception = (ResponseStatusException) thrown;
        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.getReason()).isEqualTo("Invalid MB WAY phone number");
        verify(mbWayPaymentsClient, never()).createPaymentRequest(
            eq(77L),
            eq(new BigDecimal("19.99")),
            eq("EUR"),
            eq("812345678")
        );
    }

    @Test
    void callbackUpdatesOrderToPlacedWhenPaymentSucceeds() {
        MbWayService mbWayService = new MbWayService(mbWayPaymentsClient, orderRepository);
        Order order = order(77L, "19.99");
        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentReference("MBWAY-REF-123");

        when(orderRepository.findByPaymentReference("MBWAY-REF-123")).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);

        mbWayService.handleCallback(new MbWayCallbackRequest("MBWAY-REF-123", "PAID"));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        verify(orderRepository).save(order);
    }

    @Test
    void callbackIgnoresPendingPaymentWithoutUpdatingOrder() {
        MbWayService mbWayService = new MbWayService(mbWayPaymentsClient, orderRepository);

        mbWayService.handleCallback(new MbWayCallbackRequest("MBWAY-REF-123", "PENDING"));

        verify(orderRepository, never()).findByPaymentReference("MBWAY-REF-123");
        verify(orderRepository, never()).save(org.mockito.ArgumentMatchers.any(Order.class));
    }

    private Order order(Long id, String totalAmount) {
        Order order = new Order();
        order.setId(id);
        order.setTotalAmount(new BigDecimal(totalAmount));
        return order;
    }
}
