package pt.trevo.trevo_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.BaseUnitTest;
import pt.trevo.trevo_api.persistence.entity.Product;
import pt.trevo.trevo_api.persistence.entity.ProductImage;
import pt.trevo.trevo_api.persistence.entity.ProductStatus;

class HttpAiImageGenerationClientTest extends BaseUnitTest {

    @Mock private ReplicateApiClient replicateApiClient;

    private HttpAiImageGenerationClient client;

    @BeforeEach
    void setUp() {
        Map<String, String> modelPhotos = Map.of(
            "slim", "https://example.com/slim.jpg",
            "athletic", "https://example.com/athletic.jpg",
            "regular", "https://example.com/regular.jpg",
            "plusSize", "https://example.com/plus-size.jpg"
        );
        // Create TryOnConfig with the test model photos
        pt.trevo.trevo_api.config.TryOnConfig config = new pt.trevo.trevo_api.config.TryOnConfig(modelPhotos);
        client = new HttpAiImageGenerationClient(replicateApiClient, config);
    }

    @Test
    void generateTryOnReturnsImageUrlOnSuccessfulPrediction() {
        Product product = productWithImage("https://cdn.example.com/shirt.jpg");
        when(replicateApiClient.createAndAwaitPrediction(
            "https://cdn.example.com/shirt.jpg",
            "https://example.com/slim.jpg",
            "Linen Shirt"
        )).thenReturn("https://replicate.delivery/result.png");

        String result = client.generateTryOn(product, "slim");

        assertThat(result).isEqualTo("https://replicate.delivery/result.png");
    }

    @Test
    void generateTryOnThrows400WhenProductHasNoImages() {
        Product product = productWithoutImages();

        Throwable thrown = catchThrowable(() -> client.generateTryOn(product, "slim"));

        assertThat(thrown).isInstanceOf(ResponseStatusException.class);
        assertThat(((ResponseStatusException) thrown).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(((ResponseStatusException) thrown).getReason()).isEqualTo("Product has no images");
    }

    @Test
    void generateTryOnThrows400WhenModelIdentifierHasNoPhoto() {
        Product product = productWithImage("https://cdn.example.com/shirt.jpg");

        Throwable thrown = catchThrowable(() -> client.generateTryOn(product, "unknown-type"));

        assertThat(thrown).isInstanceOf(ResponseStatusException.class);
        assertThat(((ResponseStatusException) thrown).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(((ResponseStatusException) thrown).getReason()).contains("No reference photo configured");
    }

    private Product productWithImage(String imageUrl) {
        ProductImage image = new ProductImage();
        image.setImageUrl(imageUrl);
        Product product = Product.builder()
            .id(1L)
            .name("Linen Shirt")
            .price(new BigDecimal("49.99"))
            .status(ProductStatus.ACTIVE)
            .build();
        product.setImages(List.of(image));
        return product;
    }

    private Product productWithoutImages() {
        Product product = Product.builder()
            .id(2L)
            .name("Empty Product")
            .price(new BigDecimal("10.00"))
            .status(ProductStatus.ACTIVE)
            .build();
        product.setImages(List.of());
        return product;
    }
}
