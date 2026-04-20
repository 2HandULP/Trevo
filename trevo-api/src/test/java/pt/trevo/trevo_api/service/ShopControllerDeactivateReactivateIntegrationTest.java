package pt.trevo.trevo_api.service;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.User;

@SpringBootTest
@AutoConfigureMockMvc
class ShopControllerDeactivateReactivateIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ShopService shopService;

    @Test
    @WithMockUser(username = "1", authorities = "ROLE_ADMIN")
    void deactivateShopReturnsShopWithIsActiveFalse() throws Exception {
        Long shopId = 1L;

        Shop deactivatedShop = Shop.builder()
            .id(shopId)
            .owner(User.builder().id(11L).build())
            .name("My Shop")
            .isActive(false)
            .status(ShopStatus.DEACTIVATED)
            .build();

        when(shopService.deactivateShop(any(), any())).thenReturn(deactivatedShop);

        mockMvc.perform(
            post("/api/shops/{shopId}/deactivate", shopId)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(1)));
    }

    @Test
    @WithMockUser(username = "1", authorities = "ROLE_ADMIN")
    void reactivateShopReturnsShopWithIsActiveTrue() throws Exception {
        Long shopId = 1L;

        Shop reactivatedShop = Shop.builder()
            .id(shopId)
            .owner(User.builder().id(11L).build())
            .name("My Shop")
            .isActive(true)
            .status(ShopStatus.ACTIVE)
            .build();

        when(shopService.reactivateShop(any(), any())).thenReturn(reactivatedShop);

        mockMvc.perform(
            post("/api/shops/{shopId}/reactivate", shopId)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(1)));
    }

    @Test
    @WithMockUser(username = "1", authorities = "ROLE_ADMIN")
    void deactivateShopReturnsNotFoundWhenShopDoesNotExist() throws Exception {
        Long shopId = 999L;

        when(shopService.deactivateShop(any(), any()))
            .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        mockMvc.perform(
            post("/api/shops/{shopId}/deactivate", shopId)
        )
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "1", authorities = "ROLE_ADMIN")
    void reactivateShopReturnsNotFoundWhenShopDoesNotExist() throws Exception {
        Long shopId = 999L;

        when(shopService.reactivateShop(any(), any()))
            .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        mockMvc.perform(
            post("/api/shops/{shopId}/reactivate", shopId)
        )
            .andExpect(status().isNotFound());
    }
}
