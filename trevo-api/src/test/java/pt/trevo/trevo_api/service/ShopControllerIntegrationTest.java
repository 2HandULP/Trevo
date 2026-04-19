package pt.trevo.trevo_api.service;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.User;

@SpringBootTest
@AutoConfigureMockMvc
class ShopControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ShopService shopService;

    @Test
    @WithMockUser(username = "11", authorities = "ROLE_SHOP_OWNER")
    void createShopReturnsCreatedShopWhenAuthorized() throws Exception {
        Long ownerId = 11L;
        CreateShopRequest request = new CreateShopRequest("My Shop", "A description", "123456789", null, null);
        
        Shop savedShop = Shop.builder()
            .id(1L)
            .owner(User.builder().id(ownerId).build())
            .name("My Shop")
            .description("A description")
            .nif("123456789")
            .status(ShopStatus.PENDING)
            .build();

        when(shopService.createShop(eq(ownerId), eq(Role.SHOP_OWNER), any(CreateShopRequest.class)))
            .thenReturn(savedShop);

        mockMvc.perform(
            post("/api/shops")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id", is(1)))
            .andExpect(jsonPath("$.ownerId", is(11)))
            .andExpect(jsonPath("$.name", is("My Shop")))
            .andExpect(jsonPath("$.description", is("A description")))
            .andExpect(jsonPath("$.nif", is("123456789")))
            .andExpect(jsonPath("$.status", is("PENDING")));
    }

    @Test
    @WithMockUser(username = "22", authorities = "ROLE_BUYER")
    void createShopReturnsForbiddenWhenCallerIsNotShopOwner() throws Exception {
        CreateShopRequest request = new CreateShopRequest("My Shop", "A description", "123456789", null, null);

        when(shopService.createShop(eq(22L), eq(Role.BUYER), any(CreateShopRequest.class)))
            .thenThrow(new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only shop owners can create shops"
            ));

        mockMvc.perform(
            post("/api/shops")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "11", authorities = "ROLE_SHOP_OWNER")
    void createShopReturnsConflictWhenOwnerAlreadyHasShop() throws Exception {
        Long ownerId = 11L;
        CreateShopRequest request = new CreateShopRequest("My Shop", "A description", "123456789", null, null);

        when(shopService.createShop(eq(ownerId), eq(Role.SHOP_OWNER), any(CreateShopRequest.class)))
            .thenThrow(new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Owner already has a shop"
            ));

        mockMvc.perform(
            post("/api/shops")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isConflict());
    }
}
