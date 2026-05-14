package pt.trevo.trevo_api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.auth.AppUserDetailsService;
import pt.trevo.trevo_api.auth.JwtService;
import pt.trevo.trevo_api.config.SecurityConfig;
import pt.trevo.trevo_api.dto.CheckoutRequest;
import pt.trevo.trevo_api.dto.OrderItemResponse;
import pt.trevo.trevo_api.dto.OrderResponse;
import pt.trevo.trevo_api.dto.UpdateOrderStatusRequest;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.entity.PaymentMethod;
import pt.trevo.trevo_api.persistence.repository.RefreshTokenRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;
import pt.trevo.trevo_api.security.SecurityUtils;
import pt.trevo.trevo_api.service.OrderService;

@WebMvcTest(OrderController.class)
@Import({SecurityConfig.class, SecurityUtils.class})
class OrderControllerIntegrationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private AppUserDetailsService appUserDetailsService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ShopRepository shopRepository;

    @MockitoBean
    private RefreshTokenRepository refreshTokenRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private OrderResponse sampleOrder(Long id, OrderStatus status) {
        OrderItemResponse item = new OrderItemResponse(
            1L, 10L, 20L, "Blue Shirt", "M", "Blue", 2,
            new BigDecimal("25.00"), new BigDecimal("50.00")
        );
        return new OrderResponse(
            id, 5L, "Cool Shop", status, null,
            new BigDecimal("50.00"), new BigDecimal("5.00"),
            PaymentMethod.MBWAY, null,
            Instant.parse("2025-01-01T10:00:00Z"), Instant.parse("2025-01-01T10:00:00Z"),
            List.of(item)
        );
    }

    // --- POST /api/buyer/orders/checkout ---

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void checkoutCreatesOrdersAndReturnsCreated() throws Exception {
        CheckoutRequest request = new CheckoutRequest(PaymentMethod.MBWAY);
        when(orderService.checkout(1L, PaymentMethod.MBWAY))
            .thenReturn(List.of(sampleOrder(100L, OrderStatus.PLACED)));

        mockMvc.perform(post("/api/buyer/orders/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$[0].id").value(100))
            .andExpect(jsonPath("$[0].status").value("PLACED"))
            .andExpect(jsonPath("$[0].shopName").value("Cool Shop"))
            .andExpect(jsonPath("$[0].paymentMethod").value("MBWAY"));
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void checkoutReturnsBadRequestWhenPaymentMethodMissing() throws Exception {
        mockMvc.perform(post("/api/buyer/orders/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void checkoutPropagatesEmptyCartError() throws Exception {
        CheckoutRequest request = new CheckoutRequest(PaymentMethod.MBWAY);
        when(orderService.checkout(1L, PaymentMethod.MBWAY))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty"));

        mockMvc.perform(post("/api/buyer/orders/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void checkoutRequiresAuthentication() throws Exception {
        CheckoutRequest request = new CheckoutRequest(PaymentMethod.MBWAY);
        mockMvc.perform(post("/api/buyer/orders/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void checkoutForbidsShopOwner() throws Exception {
        CheckoutRequest request = new CheckoutRequest(PaymentMethod.MBWAY);
        mockMvc.perform(post("/api/buyer/orders/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    // --- GET /api/buyer/orders ---

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void getBuyerOrdersReturnsOrderList() throws Exception {
        when(orderService.getBuyerOrders(1L))
            .thenReturn(List.of(sampleOrder(100L, OrderStatus.PLACED), sampleOrder(101L, OrderStatus.CONFIRMED)));

        mockMvc.perform(get("/api/buyer/orders"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value(100))
            .andExpect(jsonPath("$[1].id").value(101));
    }

    @Test
    void getBuyerOrdersRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/buyer/orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void getBuyerOrdersForbidsShopOwner() throws Exception {
        mockMvc.perform(get("/api/buyer/orders"))
            .andExpect(status().isForbidden());
    }

    // --- GET /api/buyer/orders/{orderId} ---

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void getBuyerOrderReturnsOrder() throws Exception {
        when(orderService.getBuyerOrder(100L, 1L)).thenReturn(sampleOrder(100L, OrderStatus.PLACED));

        mockMvc.perform(get("/api/buyer/orders/100"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(100))
            .andExpect(jsonPath("$.items[0].productName").value("Blue Shirt"));
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void getBuyerOrderReturnsForbiddenForOtherBuyersOrder() throws Exception {
        when(orderService.getBuyerOrder(100L, 1L))
            .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));

        mockMvc.perform(get("/api/buyer/orders/100"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void getBuyerOrderReturnsNotFoundForUnknownOrder() throws Exception {
        when(orderService.getBuyerOrder(eq(999L), any()))
            .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        mockMvc.perform(get("/api/buyer/orders/999"))
            .andExpect(status().isNotFound());
    }

    // --- POST /api/buyer/orders/{orderId}/cancel ---

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void cancelOrderReturnsCancelledOrder() throws Exception {
        when(orderService.cancelOrder(100L, 1L)).thenReturn(sampleOrder(100L, OrderStatus.CANCELLED));

        mockMvc.perform(post("/api/buyer/orders/100/cancel"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(100))
            .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void cancelOrderReturnsBadRequestWhenNotPlaced() throws Exception {
        when(orderService.cancelOrder(100L, 1L))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order can only be cancelled while in PLACED status"));

        mockMvc.perform(post("/api/buyer/orders/100/cancel"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void cancelOrderRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/buyer/orders/100/cancel"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void cancelOrderForbidsShopOwner() throws Exception {
        mockMvc.perform(post("/api/buyer/orders/100/cancel"))
            .andExpect(status().isForbidden());
    }

    // --- GET /api/orders (shop owner) ---

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void getShopOrdersReturnsOrderList() throws Exception {
        when(orderService.getShopOrders(2L))
            .thenReturn(List.of(sampleOrder(100L, OrderStatus.PLACED)));

        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(100))
            .andExpect(jsonPath("$[0].shopName").value("Cool Shop"));
    }

    @Test
    void getShopOrdersRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void getShopOrdersForbidsBuyer() throws Exception {
        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isForbidden());
    }

    // --- PATCH /api/orders/{orderId}/status ---

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void updateOrderStatusReturnsUpdatedOrder() throws Exception {
        UpdateOrderStatusRequest request = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);
        when(orderService.updateStatus(100L, OrderStatus.CONFIRMED, 2L))
            .thenReturn(sampleOrder(100L, OrderStatus.CONFIRMED));

        mockMvc.perform(patch("/api/orders/100/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(100))
            .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void updateOrderStatusReturnsBadRequestForInvalidTransition() throws Exception {
        UpdateOrderStatusRequest request = new UpdateOrderStatusRequest(OrderStatus.SHIPPED);
        when(orderService.updateStatus(100L, OrderStatus.SHIPPED, 2L))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status transition"));

        mockMvc.perform(patch("/api/orders/100/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void updateOrderStatusReturnsForbiddenForWrongShopOwner() throws Exception {
        UpdateOrderStatusRequest request = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);
        when(orderService.updateStatus(100L, OrderStatus.CONFIRMED, 2L))
            .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Only shop owner can update order status"));

        mockMvc.perform(patch("/api/orders/100/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void updateOrderStatusReturnsBadRequestWhenStatusMissing() throws Exception {
        mockMvc.perform(patch("/api/orders/100/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void updateOrderStatusRequiresAuthentication() throws Exception {
        UpdateOrderStatusRequest request = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);
        mockMvc.perform(patch("/api/orders/100/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void updateOrderStatusForbidsBuyer() throws Exception {
        UpdateOrderStatusRequest request = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);
        mockMvc.perform(patch("/api/orders/100/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }
}
