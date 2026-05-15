package pt.trevo.trevo_api.service;

import java.util.Base64;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Product;
import pt.trevo.trevo_api.persistence.entity.ProductImage;

@Service
public class HttpAiImageGenerationClient implements AiImageGenerationClient {

    private static final Logger log = LoggerFactory.getLogger(HttpAiImageGenerationClient.class);

    private final String baseUrl;
    private final String tryOnPath;
    private final String personalizedTryOnPath;

    public HttpAiImageGenerationClient(
        @Value("${app.ai.image-generation.base-url:}") String baseUrl,
        @Value("${app.ai.image-generation.try-on-path:/try-on}") String tryOnPath,
        @Value("${app.ai.image-generation.personalized-try-on-path:/try-on/personalized}") String personalizedTryOnPath
    ) {
        this.baseUrl = baseUrl;
        this.tryOnPath = tryOnPath;
        this.personalizedTryOnPath = personalizedTryOnPath;
    }

    @Override
    public String generateTryOn(Product product, String modelIdentifier) {
        ensureConfigured();
        StandardTryOnGenerationRequest request = new StandardTryOnGenerationRequest(
            product.getId(),
            product.getName(),
            modelIdentifier,
            productImageUrls(product)
        );
        return postForImageUrl(tryOnPath, request);
    }

    @Override
    public String generatePersonalizedTryOn(Product product, List<UserPhotoInput> photos) {
        ensureConfigured();
        PersonalizedTryOnGenerationRequest request = new PersonalizedTryOnGenerationRequest(
            product.getId(),
            product.getName(),
            productImageUrls(product),
            photos.stream().map(this::toPayload).toList()
        );
        return postForImageUrl(personalizedTryOnPath, request);
    }

    private String postForImageUrl(String path, Object request) {
        try {
            AiImageGenerationResponse response = RestClient.builder()
                .baseUrl(baseUrl)
                .build()
                .post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(AiImageGenerationResponse.class);

            if (response == null || response.imageUrl() == null || response.imageUrl().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation API returned no image URL");
            }
            return response.imageUrl();
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RestClientException exception) {
            log.error("AI image generation API request failed", exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation API request failed");
        }
    }

    private void ensureConfigured() {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation API is not configured");
        }
    }

    private List<String> productImageUrls(Product product) {
        return product.getImages().stream()
            .map(ProductImage::getImageUrl)
            .toList();
    }

    private PhotoPayload toPayload(UserPhotoInput photo) {
        return new PhotoPayload(
            photo.filename(),
            photo.contentType(),
            Base64.getEncoder().encodeToString(photo.bytes())
        );
    }

    private record StandardTryOnGenerationRequest(
        Long productId,
        String productName,
        String modelIdentifier,
        List<String> productImageUrls
    ) {
    }

    private record PersonalizedTryOnGenerationRequest(
        Long productId,
        String productName,
        List<String> productImageUrls,
        List<PhotoPayload> photos
    ) {
    }

    private record PhotoPayload(String filename, String contentType, String base64Content) {
    }

    private record AiImageGenerationResponse(String imageUrl) {
    }
}
