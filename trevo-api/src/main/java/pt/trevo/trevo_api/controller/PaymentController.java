package pt.trevo.trevo_api.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.dto.CreatePaymentIntentRequest;
import pt.trevo.trevo_api.dto.PaymentIntentResponse;
import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.entity.PaymentMethod;
import pt.trevo.trevo_api.persistence.repository.OrderRepository;
import pt.trevo.trevo_api.security.SecurityUtils;
import pt.trevo.trevo_api.service.PaymentService;
import pt.trevo.trevo_api.service.StripeWebhookService;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final StripeWebhookService stripeWebhookService;
    private final OrderRepository orderRepository;
    private final SecurityUtils securityUtils;

    public PaymentController(
        PaymentService paymentService,
        StripeWebhookService stripeWebhookService,
        OrderRepository orderRepository,
        SecurityUtils securityUtils
    ) {
        this.paymentService = paymentService;
        this.stripeWebhookService = stripeWebhookService;
        this.orderRepository = orderRepository;
        this.securityUtils = securityUtils;
    }

    @PostMapping("/stripe/payment-intents")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('BUYER')")
    public PaymentIntentResponse createStripePaymentIntent(
        @Valid @RequestBody CreatePaymentIntentRequest request,
        Authentication authentication
    ) {
        Long buyerId = securityUtils.requireUserId(authentication);
        Order order = orderRepository.findById(request.orderId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!order.getBuyer().getId().equals(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only buyer can pay this order");
        }
        if (order.getPaymentMethod() != PaymentMethod.STRIPE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order payment method is not Stripe");
        }
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Order is not awaiting payment");
        }

        return paymentService.createPaymentIntent(order);
    }

    @PostMapping("/stripe/webhook")
    public ResponseEntity<Void> handleStripeWebhook(
        @RequestBody String payload,
        @RequestHeader("Stripe-Signature") String signatureHeader
    ) {
        stripeWebhookService.handleWebhook(payload, signatureHeader);
        return ResponseEntity.ok().build();
    }
}
