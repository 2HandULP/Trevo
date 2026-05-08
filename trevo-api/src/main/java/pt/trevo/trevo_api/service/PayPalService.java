package pt.trevo.trevo_api.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.dto.PayPalCaptureResponse;
import pt.trevo.trevo_api.dto.PayPalOrderResponse;
import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.repository.OrderRepository;

@Service
public class PayPalService {

    private static final String EUR_CURRENCY = "EUR";
    private static final String COMPLETED_STATUS = "COMPLETED";

    private final PayPalOrdersClient payPalOrdersClient;
    private final OrderRepository orderRepository;

    public PayPalService(PayPalOrdersClient payPalOrdersClient, OrderRepository orderRepository) {
        this.payPalOrdersClient = payPalOrdersClient;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public PayPalOrderResponse createOrder(Order order) {
        if (order == null || order.getId() == null || order.getTotalAmount() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid PayPal order request");
        }

        BigDecimal amount = eurAmount(order.getTotalAmount());
        PayPalOrderResponse payPalOrder = payPalOrdersClient.createOrder(order.getId(), amount, EUR_CURRENCY);

        order.setPaymentReference(payPalOrder.id());
        orderRepository.save(order);

        return payPalOrder;
    }

    @Transactional
    public PayPalCaptureResponse capturePayment(String paypalOrderId) {
        if (paypalOrderId == null || paypalOrderId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid PayPal capture request");
        }

        PayPalCaptureResponse capture = payPalOrdersClient.captureOrder(paypalOrderId);
        if (!COMPLETED_STATUS.equals(capture.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayPal capture failed");
        }

        orderRepository.findByPaymentReference(paypalOrderId).ifPresent(order -> {
            order.setStatus(OrderStatus.PLACED);
            orderRepository.save(order);
        });

        return capture;
    }

    private BigDecimal eurAmount(BigDecimal amount) {
        if (amount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment amount must be positive");
        }

        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
