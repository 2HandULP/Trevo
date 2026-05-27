package pt.trevo.trevo_api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.auth.AppUserDetailsService;
import pt.trevo.trevo_api.auth.JwtService;
import pt.trevo.trevo_api.config.SecurityConfig;
import pt.trevo.trevo_api.dto.TryOnImageResponse;
import pt.trevo.trevo_api.dto.TryOnRequest;
import pt.trevo.trevo_api.persistence.repository.RefreshTokenRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;
import pt.trevo.trevo_api.security.SecurityUtils;
import pt.trevo.trevo_api.service.TryOnService;

@WebMvcTest(TryOnController.class)
@Import({SecurityConfig.class, SecurityUtils.class, ImageUploadValidator.class})
class TryOnControllerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private TryOnService tryOnService;
    @MockitoBean private AppUserDetailsService appUserDetailsService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserRepository userRepository;
    @MockitoBean private RefreshTokenRepository refreshTokenRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @WithMockUser(username = "10", roles = "BUYER")
    void postTryOnReturnsOkForFreeUserFirstCallAndPaymentRequiredForSecondCall() throws Exception {
        TryOnRequest request = new TryOnRequest(20L, "classic-model");
        when(tryOnService.generateTryOn(eq(10L), eq(20L), eq("classic-model")))
            .thenReturn(new TryOnImageResponse("https://ai.example/first.png"))
            .thenThrow(new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Free users can generate one try-on per product"));

        mockMvc.perform(post("/api/buyer/try-on")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.imageUrl").value("https://ai.example/first.png"));

        mockMvc.perform(post("/api/buyer/try-on")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isPaymentRequired())
            .andExpect(jsonPath("$.detail").value("Free users can generate one try-on per product"));
    }

    @Test
    @WithMockUser(username = "10", roles = "BUYER")
    void postPersonalizedTryOnReturnsForbiddenForNonProUser() throws Exception {
        when(tryOnService.generatePersonalizedTryOn(eq(10L), eq(20L), anyList()))
            .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Personalized try-on requires a Pro subscription"));

        mockMvc.perform(multipart("/api/buyer/try-on/personalized")
                .file(photo("photo-1.jpg"))
                .file(photo("photo-2.jpg"))
                .file(photo("photo-3.jpg"))
                .param("productId", "20"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.detail").value("Personalized try-on requires a Pro subscription"));
    }

    @Test
    @WithMockUser(username = "10", roles = "BUYER")
    void postPersonalizedTryOnReturnsBadRequestWhenPhotosAreMissing() throws Exception {
        mockMvc.perform(multipart("/api/buyer/try-on/personalized")
                .file(photo("photo-1.jpg"))
                .file(photo("photo-2.jpg"))
                .param("productId", "20"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "10", roles = "BUYER")
    void postPersonalizedTryOnReturnsOkForValidProRequest() throws Exception {
        when(tryOnService.generatePersonalizedTryOn(eq(10L), eq(20L), anyList()))
            .thenReturn(new TryOnImageResponse("https://ai.example/personalized.png"));

        mockMvc.perform(multipart("/api/buyer/try-on/personalized")
                .file(photo("photo-1.jpg"))
                .file(photo("photo-2.jpg"))
                .file(photo("photo-3.jpg"))
                .param("productId", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.imageUrl").value("https://ai.example/personalized.png"));
    }

    @Test
    @WithMockUser(username = "10", roles = "BUYER")
    void postPersonalizedTryOnRequiresPhotosFieldName() throws Exception {
        MockMultipartFile wrongField = new MockMultipartFile("images", "photo.jpg", "image/jpeg", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/api/buyer/try-on/personalized")
                .file(wrongField)
                .param("productId", "20"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "10", roles = "BUYER")
    void postPersonalizedTryOnRejectsUnsupportedPhotoType() throws Exception {
        MockMultipartFile textFile = new MockMultipartFile("photos", "photo.txt", "text/plain", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/api/buyer/try-on/personalized")
                .file(textFile)
                .file(photo("photo-2.jpg"))
                .file(photo("photo-3.jpg"))
                .param("productId", "20"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.detail").value("photos must be a JPEG, PNG, GIF, or WEBP image"));
    }

    @Test
    @WithMockUser(username = "10", roles = "BUYER")
    void postPersonalizedTryOnRejectsOversizedPhoto() throws Exception {
        byte[] oversized = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile largeFile = new MockMultipartFile("photos", "large.jpg", "image/jpeg", oversized);

        mockMvc.perform(multipart("/api/buyer/try-on/personalized")
                .file(largeFile)
                .file(photo("photo-2.jpg"))
                .file(photo("photo-3.jpg"))
                .param("productId", "20"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.detail").value("photos exceeds the maximum allowed size"));
    }

    private MockMultipartFile photo(String filename) {
        return new MockMultipartFile("photos", filename, "image/jpeg", new byte[] {1, 2, 3});
    }
}
