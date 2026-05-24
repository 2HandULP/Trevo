package pt.trevo.trevo_api.service;

import java.util.List;
import pt.trevo.trevo_api.persistence.entity.Product;

public interface AiImageGenerationClient {

    String generateTryOn(Product product, String modelIdentifier);

    String generatePersonalizedTryOn(Product product, List<UserPhotoInput> photos);
}
