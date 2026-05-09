package pt.trevo.trevo_api.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Cart;
import pt.trevo.trevo_api.persistence.entity.CartItem;
import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.OrderItem;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.entity.PaymentMethod;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.Variant;
import pt.trevo.trevo_api.persistence.repository.CartRepository;
import pt.trevo.trevo_api.persistence.repository.OrderRepository;
import pt.trevo.trevo_api.persistence.repository.VariantRepository;

@Service
public class OrderService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderService.class);
    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0.10");

    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final VariantRepository variantRepository;
    private final NotificationService notificationService;

    public OrderService(
        CartRepository cartRepository,
        OrderRepository orderRepository,
        VariantRepository variantRepository,
        NotificationService notificationService
    ) {
        this.cartRepository = cartRepository;
        this.orderRepository = orderRepository;
        this.variantRepository = variantRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public List<Order> checkout(Long buyerId, PaymentMethod paymentMethod) {
        if (buyerId == null || paymentMethod == null) {
            throw badRequest("Invalid checkout request");
        }

        Cart cart = cartRepository.findByBuyerIdWithItems(buyerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart not found"));

        if (cart.getItems().isEmpty()) {
            throw badRequest("Cart is empty");
        }

        // Acquire pessimistic write locks on all variants before validating stock to prevent concurrent over-selling.
        // ORDER BY v.id ensures a consistent lock acquisition order across transactions, preventing deadlocks.
        List<Long> variantIds = cart.getItems().stream()
            .map(ci -> ci.getVariant().getId())
            .sorted()
            .toList();
        Map<Long, Variant> lockedVariants = variantRepository.findByIdsForUpdate(variantIds)
            .stream()
            .collect(Collectors.toMap(Variant::getId, v -> v));

        // Validate stock for all items before creating any order
        List<Long> conflictingVariantIds = new ArrayList<>();
        for (CartItem cartItem : cart.getItems()) {
            Variant variant = lockedVariants.get(cartItem.getVariant().getId());
            if (variant.getStock() < cartItem.getQuantity()) {
                conflictingVariantIds.add(variant.getId());
            }
        }
        if (!conflictingVariantIds.isEmpty()) {
            throw badRequest("Stock conflict for variants: " + conflictingVariantIds);
        }

        // Group items by shop
        Map<Long, List<CartItem>> byShop = new LinkedHashMap<>();
        for (CartItem cartItem : cart.getItems()) {
            Long shopId = cartItem.getVariant().getProduct().getShop().getId();
            byShop.computeIfAbsent(shopId, id -> new ArrayList<>()).add(cartItem);
        }

        // Create one order per shop
        List<Order> orders = new ArrayList<>();
        for (Map.Entry<Long, List<CartItem>> entry : byShop.entrySet()) {
            List<CartItem> shopItems = entry.getValue();
            Shop shop = shopItems.get(0).getVariant().getProduct().getShop();

            Order order = new Order();
            order.setBuyer(cart.getBuyer());
            order.setShop(shop);
            order.setStatus(OrderStatus.PLACED);
            order.setPaymentMethod(paymentMethod);
            order.setCreatedAt(Instant.now());

            BigDecimal total = BigDecimal.ZERO;
            for (CartItem cartItem : shopItems) {
                Variant variant = lockedVariants.get(cartItem.getVariant().getId());
                BigDecimal unitPrice = cartItem.getVariant().getProduct().getPrice();

                OrderItem orderItem = new OrderItem();
                orderItem.setOrder(order);
                orderItem.setVariant(variant);
                orderItem.setQuantity(cartItem.getQuantity());
                orderItem.setUnitPrice(unitPrice);
                order.getItems().add(orderItem);

                total = total.add(unitPrice.multiply(BigDecimal.valueOf(cartItem.getQuantity())));

                variant.setStock(variant.getStock() - cartItem.getQuantity());
                variantRepository.save(variant);
            }

            order.setTotalAmount(total);
            order.setCommissionAmount(total.multiply(COMMISSION_RATE).setScale(2, RoundingMode.HALF_UP));
            Order savedOrder = orderRepository.save(order);
            try {
                notificationService.createNewOrderNotification(savedOrder);
            } catch (RuntimeException ex) {
                LOGGER.warn("Failed to create notification for order {}: {}", savedOrder.getId(), ex.getMessage(), ex);
            }
            orders.add(savedOrder);
        }

        // Clear the cart
        cart.getItems().clear();
        cartRepository.save(cart);

        return orders;
    }

    @Transactional
    public Order updateStatus(Long orderId, OrderStatus newStatus, Long requesterId) {
        if (orderId == null || newStatus == null || requesterId == null) {
            throw badRequest("Invalid update status request");
        }

        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!order.getShop().getOwner().getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only shop owner can update order status");
        }

        if (!isValidTransition(order.getStatus(), newStatus)) {
            throw badRequest("Invalid status transition from " + order.getStatus() + " to " + newStatus);
        }

        order.setStatus(newStatus);
        return orderRepository.save(order);
    }

    @Transactional
    public Order cancelOrder(Long orderId, Long requesterId) {
        if (orderId == null || requesterId == null) {
            throw badRequest("Invalid cancel request");
        }

        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!order.getBuyer().getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only buyer can cancel order");
        }

        if (order.getStatus() != OrderStatus.PLACED) {
            throw badRequest("Order can only be cancelled while in PLACED status");
        }

        for (OrderItem orderItem : order.getItems()) {
            Variant variant = orderItem.getVariant();
            variant.setStock(variant.getStock() + orderItem.getQuantity());
            variantRepository.save(variant);
        }

        order.setStatus(OrderStatus.CANCELLED);
        return orderRepository.save(order);
    }

    private boolean isValidTransition(OrderStatus from, OrderStatus to) {
        return switch (from) {
            case PLACED -> to == OrderStatus.CONFIRMED;
            case CONFIRMED -> to == OrderStatus.SHIPPED;
            case SHIPPED -> to == OrderStatus.DELIVERED;
            case DELIVERED -> to == OrderStatus.RETURNED;
            default -> false;
        };
    }

    private ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
