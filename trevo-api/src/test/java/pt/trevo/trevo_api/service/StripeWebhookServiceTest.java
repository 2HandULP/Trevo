package pt.trevo.trevo_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.stripe.Stripe;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.BaseUnitTest;
import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.repository.OrderRepository;

class StripeWebhookServiceTest extends BaseUnitTest {

    private static final String WEBHOOK_SECRET = "whsec_test_secret";

    @Mock
    private OrderRepository orderRepository;

    @Test
    void validWebhookSignatureAcceptedAndPaymentIntentSucceededUpdatesOrderToPlaced() throws Exception {
        StripeWebhookService stripeWebhookService = new StripeWebhookService(orderRepository, WEBHOOK_SECRET);
        Order order = new Order();
        order.setId(77L);
        order.setStatus(OrderStatus.CANCELLED);
        String payload = paymentIntentSucceededPayload("pi_123", "77");

        when(orderRepository.findById(77L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        stripeWebhookService.handleWebhook(payload, stripeSignature(payload, WEBHOOK_SECRET));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(order.getPaymentReference()).isEqualTo("pi_123");
        verify(orderRepository).save(order);
    }

    @Test
    void invalidWebhookSignatureRejected() {
        StripeWebhookService stripeWebhookService = new StripeWebhookService(orderRepository, WEBHOOK_SECRET);
        String payload = paymentIntentSucceededPayload("pi_123", "77");

        Throwable thrown = catchThrowable(() ->
            stripeWebhookService.handleWebhook(payload, "t=123,v1=invalid")
        );

        assertThat(thrown).isInstanceOf(ResponseStatusException.class);
        ResponseStatusException exception = (ResponseStatusException) thrown;
        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.getReason()).isEqualTo("Invalid Stripe webhook signature");
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void unrelatedStripeEventIsAcceptedWithoutUpdatingOrder() throws Exception {
        StripeWebhookService stripeWebhookService = new StripeWebhookService(orderRepository, WEBHOOK_SECRET);
        String payload = """
            {
              "id": "evt_123",
              "object": "event",
              "api_version": "%s",
              "type": "payment_intent.created",
              "data": {
                "object": {
                  "id": "pi_123",
                  "object": "payment_intent",
                  "metadata": {
                    "orderId": "77"
                  }
                }
              }
            }
            """.formatted(Stripe.API_VERSION);

        stripeWebhookService.handleWebhook(payload, stripeSignature(payload, WEBHOOK_SECRET));

        verify(orderRepository, never()).save(any(Order.class));
    }

    private String paymentIntentSucceededPayload(String paymentIntentId, String orderId) {
        return """
            {
              "id": "evt_123",
              "object": "event",
              "api_version": "%s",
              "type": "payment_intent.succeeded",
              "data": {
                "object": {
                  "id": "%s",
                  "object": "payment_intent",
                  "status": "succeeded",
                  "metadata": {
                    "orderId": "%s"
                  }
                }
              }
            }
            """.formatted(Stripe.API_VERSION, paymentIntentId, orderId);
    }

    private String stripeSignature(String payload, String secret) throws Exception {
        long timestamp = Instant.now().getEpochSecond();
        String signedPayload = timestamp + "." + payload;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = HexFormat.of().formatHex(mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8)));
        return "t=" + timestamp + ",v1=" + signature;
    }
}
