package pt.trevo.trevo_api.service;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Product;
import pt.trevo.trevo_api.persistence.entity.ProductImage;

@Service
public class HttpAiImageGenerationClient implements AiImageGenerationClient {

    private final ReplicateApiClient replicateApiClient;

    public HttpAiImageGenerationClient(ReplicateApiClient replicateApiClient) {
        this.replicateApiClient = replicateApiClient;
    }

    @Override
    public String generateTryOn(Product product, UserPhotoInput photo) {
        String garmentImageUrl = firstProductImageUrl(product);
        String humanImageUrl = photo.temporaryUrl();
        return replicateApiClient.createAndAwaitPrediction(garmentImageUrl, humanImageUrl, product.getName());
    }

    private String firstProductImageUrl(Product product) {
        List<ProductImage> images = product.getImages();
        if (images == null || images.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product has no images");
        }
        return images.getFirst().getImageUrl();
    }
}
