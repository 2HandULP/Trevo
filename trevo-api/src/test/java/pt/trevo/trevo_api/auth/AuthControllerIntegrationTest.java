package pt.trevo.trevo_api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import pt.trevo.trevo_api.persistence.entity.RefreshToken;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.Status;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.RefreshTokenRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:auth-controller;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void cleanDatabase() {
        refreshTokenRepository.deleteAll();
        shopRepository.deleteAll();
        userRepository.deleteAll();
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void buyerRegistrationEndpointReturnsCreatedAndPersistsBuyer() throws Exception {
        RegisterBuyerRequest request = new RegisterBuyerRequest("buyer@example.com", "Secret123!", "Buyer Name", "912345678");

        mockMvc.perform(post("/api/auth/register/buyer")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("buyer@example.com"))
            .andExpect(jsonPath("$.role").value("BUYER"))
            .andExpect(jsonPath("$.status").value("ACTIVE"));

        User savedUser = userRepository.findByEmail("buyer@example.com").orElseThrow();
        assertThat(savedUser.getRole()).isEqualTo(Role.BUYER);
        assertThat(savedUser.getStatus()).isEqualTo(Status.ACTIVE);
        assertThat(savedUser.getPasswordHash()).startsWith("$2");
    }

    @Test
    void buyerRegistrationEndpointReturnsConflictForDuplicateEmail() throws Exception {
        userRepository.save(User.builder()
            .email("buyer@example.com")
            .passwordHash("$2a$10$existingHash")
            .fullName("Existing Buyer")
            .role(Role.BUYER)
            .status(Status.ACTIVE)
            .build());

        RegisterBuyerRequest request = new RegisterBuyerRequest("buyer@example.com", "Secret123!", "Buyer Name", "912345678");

        mockMvc.perform(post("/api/auth/register/buyer")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isConflict());
    }

    @Test
    void buyerRegistrationEndpointReturnsBadRequestForMissingFields() throws Exception {
        RegisterBuyerRequest request = new RegisterBuyerRequest("", "", "", null);

        mockMvc.perform(post("/api/auth/register/buyer")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shopOwnerRegistrationEndpointReturnsCreatedAndPersistsPendingOwnerAndShop() throws Exception {
        RegisterShopOwnerRequest request = new RegisterShopOwnerRequest(
            "shop@example.com",
            "Secret123!",
            "Shop Owner",
            "912345678",
            "Trevo Boutique",
            "123456789"
        );

        mockMvc.perform(post("/api/auth/register/shop-owner")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("shop@example.com"))
            .andExpect(jsonPath("$.role").value("SHOP_OWNER"))
            .andExpect(jsonPath("$.status").value("PENDING"));

        User savedUser = userRepository.findByEmail("shop@example.com").orElseThrow();
        Shop savedShop = shopRepository.findByOwnerId(savedUser.getId()).orElseThrow();
        assertThat(savedUser.getRole()).isEqualTo(Role.SHOP_OWNER);
        assertThat(savedUser.getStatus()).isEqualTo(Status.PENDING);
        assertThat(savedShop.getNif()).isEqualTo("123456789");
    }

    @Test
    void shopOwnerRegistrationEndpointReturnsBadRequestForInvalidNif() throws Exception {
        RegisterShopOwnerRequest request = new RegisterShopOwnerRequest(
            "shop@example.com",
            "Secret123!",
            "Shop Owner",
            "912345678",
            "Trevo Boutique",
            "12345"
        );

        mockMvc.perform(post("/api/auth/register/shop-owner")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void loginEndpointReturnsTokenPairAndPersistsRefreshToken() throws Exception {
        String email = "login@example.com";
        String password = "Secret123!";
        mockMvc.perform(post("/api/auth/register/buyer")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RegisterBuyerRequest(email, password, "Login User", "912345678"))))
            .andExpect(status().isCreated());

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isString())
            .andExpect(jsonPath("$.refreshToken").isString())
            .andReturn();

        TokenPairResponse response = objectMapper.readValue(result.getResponse().getContentAsByteArray(), TokenPairResponse.class);
        RefreshToken savedToken = refreshTokenRepository.findByTokenAndRevokedFalse(response.refreshToken()).orElseThrow();
        User savedUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(savedToken.getUser().getId()).isEqualTo(savedUser.getId());
    }

    @Test
    void loginEndpointReturnsUnauthorizedForWrongPassword() throws Exception {
        mockMvc.perform(post("/api/auth/register/buyer")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RegisterBuyerRequest(
                    "login-wrong@example.com",
                    "Secret123!",
                    "Login User",
                    "912345678"
                ))))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("login-wrong@example.com", "wrong-password"))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void loginEndpointReturnsUnauthorizedForMissingEmail() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("missing@example.com", "Secret123!"))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshEndpointReturnsNewAccessTokenAndRotatesRefreshToken() throws Exception {
        String email = "refresh@example.com";
        String password = "Secret123!";
        mockMvc.perform(post("/api/auth/register/buyer")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RegisterBuyerRequest(email, password, "Refresh User", "912345678"))))
            .andExpect(status().isCreated());

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
            .andExpect(status().isOk())
            .andReturn();
        TokenPairResponse loginResponse =
            objectMapper.readValue(loginResult.getResponse().getContentAsByteArray(), TokenPairResponse.class);

        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RefreshTokenRequest(loginResponse.refreshToken()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isString())
            .andExpect(jsonPath("$.refreshToken").isString())
            .andReturn();

        TokenPairResponse refreshResponse =
            objectMapper.readValue(refreshResult.getResponse().getContentAsByteArray(), TokenPairResponse.class);

        assertThat(refreshResponse.refreshToken()).isNotEqualTo(loginResponse.refreshToken());
        assertThat(refreshTokenRepository.findByTokenAndRevokedFalse(loginResponse.refreshToken())).isEmpty();
        assertThat(refreshTokenRepository.findByTokenAndRevokedFalse(refreshResponse.refreshToken())).isPresent();
    }

    @Test
    void refreshEndpointReturnsUnauthorizedForExpiredRefreshToken() throws Exception {
        User user = userRepository.save(User.builder()
            .email("expired-refresh@example.com")
            .passwordHash("$2a$10$existingHash")
            .fullName("Expired Refresh")
            .role(Role.BUYER)
            .status(Status.ACTIVE)
            .build());
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setToken("expired-refresh-token");
        token.setExpiresAt(java.time.Instant.now().minusSeconds(60));
        token.setRevoked(false);
        token.setCreatedAt(java.time.Instant.now().minusSeconds(120));
        refreshTokenRepository.save(token);

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RefreshTokenRequest("expired-refresh-token"))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshEndpointReturnsUnauthorizedForRevokedRefreshToken() throws Exception {
        User user = userRepository.save(User.builder()
            .email("revoked-refresh@example.com")
            .passwordHash("$2a$10$existingHash")
            .fullName("Revoked Refresh")
            .role(Role.BUYER)
            .status(Status.ACTIVE)
            .build());
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setToken("revoked-refresh-token");
        token.setExpiresAt(java.time.Instant.now().plusSeconds(600));
        token.setRevoked(true);
        token.setCreatedAt(java.time.Instant.now().minusSeconds(120));
        refreshTokenRepository.save(token);

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RefreshTokenRequest("revoked-refresh-token"))))
            .andExpect(status().isUnauthorized());
    }
}
