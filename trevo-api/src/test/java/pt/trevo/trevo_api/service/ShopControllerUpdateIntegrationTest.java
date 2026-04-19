package pt.trevo.trevo_api.service;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.User;

@SpringBootTest
@AutoConfigureMockMvc
class ShopControllerUpdateIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ShopService shopService;

    @Test
    @WithMockUser(username = "11", authorities = "ROLE_SHOP_OWNER")
    void updateShopUpdatesDescriptionWhenOwner() throws Exception {
        Long ownerId = 11L;
        Long shopId = 1L;

        Shop updatedShop = Shop.builder()
            .id(shopId)
            .owner(User.builder().id(ownerId).build())
            .name("My Shop")
            .description("Updated description")
            .status(ShopStatus.ACTIVE)
            .build();

        when(shopService.updateShop(eq(ownerId), eq(shopId), any(UpdateShopRequest.class)))
            .thenReturn(updatedShop);

        mockMvc.perform(
            multipart("PUT", "/api/shops/{shopId}", shopId)
                .param("description", "Updated description")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(1)))
            .andExpect(jsonPath("$.description", is("Updated description")));
    }

    @Test
    @WithMockUser(username = "11", authorities = "ROLE_SHOP_OWNER")
    void updateShopUploadsLogoWhenProvided() throws Exception {
        Long ownerId = 11L;
        Long shopId = 1L;

        Shop updatedShop = Shop.builder()
            .id(shopId)
            .owner(User.builder().id(ownerId).build())
            .name("My Shop")
            .logoUrl("https://cloudinary.com/logo.jpg")
            .status(ShopStatus.ACTIVE)
            .build();

        when(shopService.updateShop(eq(ownerId), eq(shopId), any(UpdateShopRequest.class)))
            .thenReturn(updatedShop);

        MockMultipartFile logoFile = new MockMultipartFile(
            "logo",
            "logo.jpg",
            MediaType.IMAGE_JPEG_VALUE,
            "fake image content".getBytes()
        );

        mockMvc.perform(
            multipart("PUT", "/api/shops/{shopId}", shopId)
                .file(logoFile)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.logoUrl", is("https://cloudinary.com/logo.jpg")));
    }

    @Test
    @WithMockUser(username = "11", authorities = "ROLE_SHOP_OWNER")
    void updateShopUploadsBannerWhenProvided() throws Exception {
        Long ownerId = 11L;
        Long shopId = 1L;

        Shop updatedShop = Shop.builder()
            .id(shopId)
            .owner(User.builder().id(ownerId).build())
            .name("My Shop")
            .bannerUrl("https://cloudinary.com/banner.jpg")
            .status(ShopStatus.ACTIVE)
            .build();

        when(shopService.updateShop(eq(ownerId), eq(shopId), any(UpdateShopRequest.class)))
            .thenReturn(updatedShop);

        MockMultipartFile bannerFile = new MockMultipartFile(
            "banner",
            "banner.jpg",
            MediaType.IMAGE_JPEG_VALUE,
            "fake image content".getBytes()
        );

        mockMvc.perform(
            multipart("PUT", "/api/shops/{shopId}", shopId)
                .file(bannerFile)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.bannerUrl", is("https://cloudinary.com/banner.jpg")));
    }

    @Test
    @WithMockUser(username = "22", authorities = "ROLE_BUYER")
    void updateShopReturnsForbiddenWhenNotOwner() throws Exception {
        Long shopId = 1L;

        when(shopService.updateShop(eq(22L), eq(shopId), any(UpdateShopRequest.class)))
            .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Only shop owner can update this shop"));

        mockMvc.perform(
            multipart("PUT", "/api/shops/{shopId}", shopId)
                .param("description", "Updated")
        )
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "11", authorities = "ROLE_SHOP_OWNER")
    void updateShopReturnsNotFoundWhenShopDoesNotExist() throws Exception {
        Long ownerId = 11L;
        Long shopId = 999L;

        when(shopService.updateShop(eq(ownerId), eq(shopId), any(UpdateShopRequest.class)))
            .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        mockMvc.perform(
            multipart("PUT", "/api/shops/{shopId}", shopId)
                .param("description", "Updated")
        )
            .andExpect(status().isNotFound());
    }
}
