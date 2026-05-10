package pt.trevo.trevo_api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pt.trevo.trevo_api.auth.AppUserDetailsService;
import pt.trevo.trevo_api.auth.JwtService;
import pt.trevo.trevo_api.config.SecurityConfig;
import pt.trevo.trevo_api.dto.CloudinaryUploadResult;
import pt.trevo.trevo_api.persistence.repository.RefreshTokenRepository;
import pt.trevo.trevo_api.service.CloudinaryService;

@WebMvcTest(ImageUploadController.class)
@Import({SecurityConfig.class, ImageUploadValidator.class})
class ImageUploadControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CloudinaryService cloudinaryService;

    @MockitoBean
    private AppUserDetailsService appUserDetailsService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private RefreshTokenRepository refreshTokenRepository;

    @Test
    @WithMockUser(username = "11", roles = "SHOP_OWNER")
    void uploadImageReturnsCloudinaryUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "logo.png",
            MediaType.IMAGE_PNG_VALUE,
            new byte[] {1, 2, 3}
        );

        when(cloudinaryService.uploadImage(any())).thenReturn(
            new CloudinaryUploadResult("trevo/logo", "https://res.cloudinary.com/demo/image/upload/logo.png")
        );

        mockMvc.perform(multipart("/api/uploads/images").file(file))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.publicId").value("trevo/logo"))
            .andExpect(jsonPath("$.url").value("https://res.cloudinary.com/demo/image/upload/logo.png"));
    }

    @Test
    @WithMockUser(username = "11", roles = "SHOP_OWNER")
    void uploadImageRejectsUnsupportedImageTypesBeforeServiceCall() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "logo.svg",
            "image/svg+xml",
            "<svg></svg>".getBytes()
        );

        mockMvc.perform(multipart("/api/uploads/images").file(file))
            .andExpect(status().isBadRequest());

        verify(cloudinaryService, never()).uploadImage(any());
    }

    @Test
    void uploadImageRequiresAuthentication() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "logo.png",
            MediaType.IMAGE_PNG_VALUE,
            new byte[] {1, 2, 3}
        );

        mockMvc.perform(multipart("/api/uploads/images").file(file))
            .andExpect(status().isUnauthorized());
    }
}
