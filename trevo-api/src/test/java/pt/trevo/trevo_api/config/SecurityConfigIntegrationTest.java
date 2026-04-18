package pt.trevo.trevo_api.config;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import pt.trevo.trevo_api.TrevoApiApplication;
import pt.trevo.trevo_api.auth.JwtService;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.PasswordResetTokenRepository;
import pt.trevo.trevo_api.persistence.repository.RefreshTokenRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@SpringBootTest(
    classes = TrevoApiApplication.class,
    properties = {
        "spring.autoconfigure.exclude=" +
            "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration," +
            "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration," +
            "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
    }
)
@Import({
    SecurityConfigIntegrationTest.TestAuthController.class,
    SecurityConfigIntegrationTest.TestShopController.class,
    SecurityConfigIntegrationTest.TestBuyerController.class
})
class SecurityConfigIntegrationTest {

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ShopRepository shopRepository;

    @MockitoBean
    private RefreshTokenRepository refreshTokenRepository;

    @MockitoBean
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private JwtService jwtService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
            .apply(springSecurity())
            .build();
    }

    @Test
    void authEndpointsShouldBePublic() throws Exception {
        mockMvc.perform(get("/api/auth/test/public"))
            .andExpect(status().isOk());
    }

    @Test
    void sessionInvalidationEndpointShouldRejectMissingToken() throws Exception {
        mockMvc.perform(post("/api/auth/sessions/invalidate"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void sessionInvalidationEndpointShouldAllowAuthenticatedUsers() throws Exception {
        String token = generateToken(14L, Role.BUYER);

        mockMvc.perform(post("/api/auth/sessions/invalidate")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isNoContent());
    }

    @Test
    void shopEndpointsShouldRequireShopOwnerRole() throws Exception {
        String token = generateToken(10L, Role.SHOP_OWNER);

        mockMvc.perform(get("/api/shop/test/secure")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void shopEndpointsShouldRejectBuyerRole() throws Exception {
        String token = generateToken(11L, Role.BUYER);

        mockMvc.perform(get("/api/shop/test/secure")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void shopEndpointsShouldRejectMissingToken() throws Exception {
        mockMvc.perform(get("/api/shop/test/secure"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void buyerEndpointsShouldRejectShopOwners() throws Exception {
        String token = generateToken(12L, Role.SHOP_OWNER);

        mockMvc.perform(get("/api/buyer/test/secure")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void buyerEndpointsShouldAllowBuyers() throws Exception {
        String token = generateToken(13L, Role.BUYER);

        mockMvc.perform(get("/api/buyer/test/secure")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk());
    }

    private String generateToken(Long userId, Role role) {
        return jwtService.generateToken(User.builder()
            .id(userId)
            .role(role)
            .build());
    }

    @RestController
    @RequestMapping("/api/auth/test")
    static class TestAuthController {

        @GetMapping("/public")
        String publicEndpoint() {
            return "auth";
        }
    }

    @RestController
    @RequestMapping("/api/shop/test")
    static class TestShopController {

        @GetMapping("/secure")
        String secureEndpoint() {
            return "shop";
        }
    }

    @RestController
    @RequestMapping("/api/buyer/test")
    static class TestBuyerController {

        @GetMapping("/secure")
        String secureEndpoint() {
            return "buyer";
        }
    }
}
