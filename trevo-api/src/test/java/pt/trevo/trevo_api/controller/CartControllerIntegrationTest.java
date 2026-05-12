package pt.trevo.trevo_api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
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
import pt.trevo.trevo_api.dto.AddCartItemRequest;
import pt.trevo.trevo_api.dto.CartItemResponse;
import pt.trevo.trevo_api.dto.CartResponse;
import pt.trevo.trevo_api.dto.CartShopGroupResponse;
import pt.trevo.trevo_api.dto.UpdateCartItemRequest;
import pt.trevo.trevo_api.persistence.repository.RefreshTokenRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;
import pt.trevo.trevo_api.security.SecurityUtils;
import pt.trevo.trevo_api.service.CartService;

@WebMvcTest(CartController.class)
@Import({SecurityConfig.class, SecurityUtils.class})
class CartControllerIntegrationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CartService cartService;

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

    private CartResponse emptyCart() {
        return new CartResponse(List.of(), BigDecimal.ZERO);
    }

    private CartResponse cartWithOneItem() {
        CartItemResponse item = new CartItemResponse(1L, 10L, 20L, "Blue Shirt", null, "M", "Blue", 2, new BigDecimal("25.00"), new BigDecimal("50.00"));
        CartShopGroupResponse group = new CartShopGroupResponse(5L, "Cool Shop", List.of(item), new BigDecimal("50.00"));
        return new CartResponse(List.of(group), new BigDecimal("50.00"));
    }

    // --- GET /api/buyer/cart ---

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void getCartReturnsBuyerCart() throws Exception {
        when(cartService.getCart(1L)).thenReturn(cartWithOneItem());

        mockMvc.perform(get("/api/buyer/cart"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.grandTotal").value("50.0"))
            .andExpect(jsonPath("$.shops[0].shopName").value("Cool Shop"))
            .andExpect(jsonPath("$.shops[0].items[0].productName").value("Blue Shirt"));
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void getCartReturnsEmptyCartWhenNothingAdded() throws Exception {
        when(cartService.getCart(1L)).thenReturn(emptyCart());

        mockMvc.perform(get("/api/buyer/cart"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.grandTotal").value("0"))
            .andExpect(jsonPath("$.shops").isEmpty());
    }

    @Test
    void getCartRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/buyer/cart"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void getCartForbidsShopOwner() throws Exception {
        mockMvc.perform(get("/api/buyer/cart"))
            .andExpect(status().isForbidden());
    }

    // --- POST /api/buyer/cart/items ---

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void addItemReturnsCreatedWithUpdatedCart() throws Exception {
        AddCartItemRequest request = new AddCartItemRequest(10L, 2);
        when(cartService.getCart(1L)).thenReturn(cartWithOneItem());

        mockMvc.perform(post("/api/buyer/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.shops[0].items[0].variantId").value(10));

        verify(cartService).addItem(1L, 10L, 2);
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void addItemReturnsBadRequestWhenVariantIdMissing() throws Exception {
        mockMvc.perform(post("/api/buyer/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\":2}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void addItemReturnsBadRequestWhenQuantityIsZero() throws Exception {
        mockMvc.perform(post("/api/buyer/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"variantId\":10,\"quantity\":0}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void addItemPropagatesServiceErrors() throws Exception {
        AddCartItemRequest request = new AddCartItemRequest(10L, 99);
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested quantity exceeds available stock"))
            .when(cartService).addItem(1L, 10L, 99);

        mockMvc.perform(post("/api/buyer/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void addItemRequiresAuthentication() throws Exception {
        AddCartItemRequest request = new AddCartItemRequest(10L, 1);
        mockMvc.perform(post("/api/buyer/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void addItemForbidsShopOwner() throws Exception {
        AddCartItemRequest request = new AddCartItemRequest(10L, 1);
        mockMvc.perform(post("/api/buyer/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    // --- PUT /api/buyer/cart/items/{variantId} ---

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void updateItemReturnsUpdatedCart() throws Exception {
        UpdateCartItemRequest request = new UpdateCartItemRequest(3);
        when(cartService.getCart(1L)).thenReturn(cartWithOneItem());

        mockMvc.perform(put("/api/buyer/cart/items/10")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.grandTotal").value("50.0"));

        verify(cartService).updateQuantity(1L, 10L, 3);
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void updateItemReturnsBadRequestWhenQuantityMissing() throws Exception {
        mockMvc.perform(put("/api/buyer/cart/items/10")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void updateItemRequiresAuthentication() throws Exception {
        UpdateCartItemRequest request = new UpdateCartItemRequest(1);
        mockMvc.perform(put("/api/buyer/cart/items/10")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    // --- DELETE /api/buyer/cart/items/{variantId} ---

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void removeItemReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/buyer/cart/items/10"))
            .andExpect(status().isNoContent());

        verify(cartService).removeItem(1L, 10L);
    }

    @Test
    @WithMockUser(username = "1", roles = "BUYER")
    void removeItemPropagatesNotFound() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart item not found"))
            .when(cartService).removeItem(eq(1L), any());

        mockMvc.perform(delete("/api/buyer/cart/items/99"))
            .andExpect(status().isNotFound());
    }

    @Test
    void removeItemRequiresAuthentication() throws Exception {
        mockMvc.perform(delete("/api/buyer/cart/items/10"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "2", roles = "SHOP_OWNER")
    void removeItemForbidsShopOwner() throws Exception {
        mockMvc.perform(delete("/api/buyer/cart/items/10"))
            .andExpect(status().isForbidden());
    }
}
