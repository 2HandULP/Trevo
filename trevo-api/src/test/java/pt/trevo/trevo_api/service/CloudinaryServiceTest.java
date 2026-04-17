package pt.trevo.trevo_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.mock.web.MockMultipartFile;
import pt.trevo.trevo_api.BaseUnitTest;

class CloudinaryServiceTest extends BaseUnitTest {

    @Mock
    private Cloudinary cloudinary;

    @Mock
    private Uploader uploader;

    @InjectMocks
    private CloudinaryService cloudinaryService;

    @Test
    void uploadImageReturnsUrlAndPublicIdForValidImage() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "shirt.png",
            "image/png",
            "image-bytes".getBytes()
        );

        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), any(Map.class))).thenReturn(
            Map.of(
                "public_id", "trevo/products/shirt",
                "secure_url", "https://res.cloudinary.com/demo/image/upload/shirt.png"
            )
        );

        CloudinaryUploadResult result = cloudinaryService.uploadImage(file);

        assertThat(result.publicId()).isEqualTo("trevo/products/shirt");
        assertThat(result.url()).isEqualTo("https://res.cloudinary.com/demo/image/upload/shirt.png");
        verify(uploader).upload(any(byte[].class), any(Map.class));
    }

    @Test
    void uploadImageRejectsNonImageFiles() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "notes.txt",
            "text/plain",
            "not-an-image".getBytes()
        );

        assertThatIllegalArgumentException()
            .isThrownBy(() -> cloudinaryService.uploadImage(file))
            .withMessage("Only image files are allowed");

        verify(cloudinary, never()).uploader();
    }

    @Test
    void deleteImageDelegatesToCloudinaryUploader() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);

        cloudinaryService.deleteImage("trevo/products/shirt");

        verify(uploader).destroy(eq("trevo/products/shirt"), any(Map.class));
    }

    @Test
    void deleteImageRejectsBlankPublicId() {
        assertThatIllegalArgumentException()
            .isThrownBy(() -> cloudinaryService.deleteImage("  "))
            .withMessage("Image publicId is required");
    }

    @Test
    void uploadImageWrapsCloudinaryIoFailures() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "shirt.png",
            "image/png",
            "image-bytes".getBytes()
        );

        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), any(Map.class))).thenThrow(new IOException("boom"));

        assertThatThrownBy(() -> cloudinaryService.uploadImage(file))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Failed to upload image to Cloudinary")
            .hasCauseInstanceOf(IOException.class);
    }
}
