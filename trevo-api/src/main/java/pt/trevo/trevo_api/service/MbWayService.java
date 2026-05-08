package pt.trevo.trevo_api.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.dto.MbWayCallbackRequest;
import pt.trevo.trevo_api.dto.MbWayPaymentRequestResponse;
import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.repository.OrderRepository;

@Service
public class MbWayService {

    private static final String EUR_CURRENCY = "EUR";
    private static final Set<String> SUCCESS_STATUSES = Set.of("PAID", "COMPLETED", "SUCCESS");
    private static final Pattern PORTUGUESE_MOBILE_PHONE = Pattern.compile("^(?:\\+351|00351)?9\\d{8}$");

    private final MbWayPaymentsClient mbWayPaymentsClient;
    private final OrderRepository orderRepository;

    public MbWayService(MbWayPaymentsClient mbWayPaymentsClient, OrderRepository orderRepository) {
        this.mbWayPaymentsClient = mbWayPaymentsClient;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public MbWayPaymentRequestResponse createPaymentRequest(Order order, String phoneNumber) {
        if (order == null || order.getId() == null || order.getTotalAmount() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid MB WAY payment request");
        }
        if (!isValidPhoneNumber(phoneNumber)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid MB WAY phone number");
        }

        MbWayPaymentRequestResponse response = mbWayPaymentsClient.createPaymentRequest(
            order.getId(),
            eurAmount(order.getTotalAmount()),
            EUR_CURRENCY,
            normalizePhoneNumber(phoneNumber)
        );

        order.setPaymentReference(response.reference());
        orderRepository.save(order);

        return response;
    }

    @Transactional
    public void handleCallback(MbWayCallbackRequest callback) {
        if (callback == null || callback.reference() == null || callback.reference().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid MB WAY callback");
        }

        if (!SUCCESS_STATUSES.contains(normalizeStatus(callback.status()))) {
            return;
        }

        Order order = orderRepository.findByPaymentReference(callback.reference())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        order.setStatus(OrderStatus.PLACED);
        orderRepository.save(order);
    }

    private BigDecimal eurAmount(BigDecimal amount) {
        if (amount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment amount must be positive");
        }

        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isValidPhoneNumber(String phoneNumber) {
        return phoneNumber != null && PORTUGUESE_MOBILE_PHONE.matcher(phoneNumber.replace(" ", "")).matches();
    }

    private String normalizePhoneNumber(String phoneNumber) {
        String normalized = phoneNumber.replace(" ", "");
        if (normalized.startsWith("00351")) {
            return "+351" + normalized.substring(5);
        }
        if (normalized.startsWith("+351")) {
            return normalized;
        }
        return "+351" + normalized;
    }

    private String normalizeStatus(String status) {
        return status == null ? "" : status.trim().toUpperCase();
    }
}
