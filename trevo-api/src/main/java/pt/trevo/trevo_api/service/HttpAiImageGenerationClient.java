package pt.trevo.trevo_api.service;

import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.config.TryOnConfig;
import pt.trevo.trevo_api.persistence.entity.Product;
import pt.trevo.trevo_api.persistence.entity.ProductImage;

@Service
@EnableConfigurationProperties(TryOnConfig.class)
public class HttpAiImageGenerationClient implements AiImageGenerationClient {

    private final ReplicateApiClient replicateApiClient;
    private final Map<String, String> modelPhotos;

    public HttpAiImageGenerationClient(
        ReplicateApiClient replicateApiClient,
        TryOnConfig tryOnConfig
    ) {
        this.replicateApiClient = replicateApiClient;
        this.modelPhotos = tryOnConfig.modelPhotos();
    }

    @Override
    public String generateTryOn(Product product, String modelIdentifier) {
        String garmentImageUrl = firstProductImageUrl(product);
        String humanImageUrl = resolveModelPhoto(modelIdentifier);
        return replicateApiClient.createAndAwaitPrediction(garmentImageUrl, humanImageUrl, product.getName());
    }

    @Override
    public String generatePersonalizedTryOn(Product product, List<UserPhotoInput> photos) {
        String garmentImageUrl = firstProductImageUrl(product);
        String humanImageUrl = photos.getFirst().temporaryUrl();
        return replicateApiClient.createAndAwaitPrediction(garmentImageUrl, humanImageUrl, product.getName());
    }

    private String firstProductImageUrl(Product product) {
        List<ProductImage> images = product.getImages();
        if (images == null || images.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product has no images");
        }
        return images.getFirst().getImageUrl();
    }

    private String resolveModelPhoto(String modelIdentifier) {
        String url = modelPhotos.get(modelIdentifier);
        if (url == null || url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "No reference photo configured for model: " + modelIdentifier);
        }
        return url;
    }
}
