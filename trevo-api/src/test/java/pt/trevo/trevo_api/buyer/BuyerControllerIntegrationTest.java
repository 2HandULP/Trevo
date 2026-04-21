package pt.trevo.trevo_api.buyer;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import pt.trevo.trevo_api.auth.LoginRequest;
import pt.trevo.trevo_api.auth.RegisterBuyerRequest;
import pt.trevo.trevo_api.auth.TokenPairResponse;
import pt.trevo.trevo_api.persistence.repository.RefreshTokenRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:buyer-controller;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
class BuyerControllerIntegrationTest {

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

    @Test
    void meEndpointReturnsAuthenticatedBuyerProfile() throws Exception {
        RegisterBuyerRequest registerRequest = new RegisterBuyerRequest(
            "buyer.me@example.com",
            "Secret123!",
            "Buyer Me",
            "912345678"
        );

        mockMvc.perform(post("/api/auth/register/buyer")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
            .andExpect(status().isCreated());

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(registerRequest.email(), registerRequest.password()))))
            .andExpect(status().isOk())
            .andReturn();

        TokenPairResponse tokenPair = objectMapper.readValue(
            loginResult.getResponse().getContentAsByteArray(),
            TokenPairResponse.class
        );

        mockMvc.perform(get("/api/buyer/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenPair.accessToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(registerRequest.email()))
            .andExpect(jsonPath("$.fullName").value(registerRequest.fullName()))
            .andExpect(jsonPath("$.role").value("BUYER"))
            .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void meEndpointRejectsMissingToken() throws Exception {
        mockMvc.perform(get("/api/buyer/me"))
            .andExpect(status().isUnauthorized());
    }
}
