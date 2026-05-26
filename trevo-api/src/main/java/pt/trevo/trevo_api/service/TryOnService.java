package pt.trevo.trevo_api.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.dto.TryOnImageResponse;
import pt.trevo.trevo_api.persistence.entity.Product;
import pt.trevo.trevo_api.persistence.entity.TryOnImage;
import pt.trevo.trevo_api.persistence.entity.TryOnUsage;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.ProductRepository;
import pt.trevo.trevo_api.persistence.repository.TryOnImageRepository;
import pt.trevo.trevo_api.persistence.repository.TryOnUsageRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@Service
public class TryOnService {

    private static final int FREE_GENERATION_LIMIT_PER_PRODUCT = 1;
    private static final int PERSONALIZED_PHOTO_COUNT = 3;

    private final AiImageGenerationClient aiImageGenerationClient;
    private final ProductRepository productRepository;
    private final TryOnImageRepository tryOnImageRepository;
    private final TryOnUsageRepository tryOnUsageRepository;
    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;

    public TryOnService(
        AiImageGenerationClient aiImageGenerationClient,
        ProductRepository productRepository,
        TryOnImageRepository tryOnImageRepository,
        TryOnUsageRepository tryOnUsageRepository,
        UserRepository userRepository,
        SubscriptionService subscriptionService
    ) {
        this.aiImageGenerationClient = aiImageGenerationClient;
        this.productRepository = productRepository;
        this.tryOnImageRepository = tryOnImageRepository;
        this.tryOnUsageRepository = tryOnUsageRepository;
        this.userRepository = userRepository;
        this.subscriptionService = subscriptionService;
    }

    @Transactional
    public TryOnImageResponse generateTryOn(Long buyerId, Long productId, String modelIdentifier) {
        String normalizedModelIdentifier = normalizeModelIdentifier(modelIdentifier);
        boolean proUser = subscriptionService.isProUser(buyerId);
        User buyer = findBuyer(buyerId);
        Product product = findProduct(productId);
        TryOnUsage usage = findOrCreateUsage(buyer, product);

        Optional<TryOnImage> cachedImage = tryOnImageRepository.findFirstCachedForUsage(usage.getId(), normalizedModelIdentifier);
        if (cachedImage.isPresent()) {
            return new TryOnImageResponse(cachedImage.get().getImageUrl());
        }

        enforceFreeTierLimit(proUser, usage);
        String imageUrl = aiImageGenerationClient.generateTryOn(product, normalizedModelIdentifier);
        incrementUsage(usage);
        persistImage(usage, imageUrl, normalizedModelIdentifier);

        return new TryOnImageResponse(imageUrl);
    }

    @Transactional
    public TryOnImageResponse generatePersonalizedTryOn(Long buyerId, Long productId, List<UserPhotoInput> photos) {
        if (!subscriptionService.isProUser(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Personalized try-on requires a Pro subscription");
        }
        if (photos == null || photos.size() != PERSONALIZED_PHOTO_COUNT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exactly 3 photos are required");
        }

        User buyer = findBuyer(buyerId);
        Product product = findProduct(productId);
        TryOnUsage usage = findOrCreateUsage(buyer, product);
        String personalizedModelIdentifier = personalizedModelIdentifier(buyerId);

        Optional<TryOnImage> cachedImage = tryOnImageRepository.findFirstCachedForUsage(usage.getId(), personalizedModelIdentifier);
        if (cachedImage.isPresent()) {
            return new TryOnImageResponse(cachedImage.get().getImageUrl());
        }

        String imageUrl = aiImageGenerationClient.generatePersonalizedTryOn(product, List.copyOf(photos));

        incrementUsage(usage);
        persistImage(usage, imageUrl, personalizedModelIdentifier);

        return new TryOnImageResponse(imageUrl);
    }

    private String personalizedModelIdentifier(Long buyerId) {
        return "personalized:" + buyerId;
    }

    private String normalizeModelIdentifier(String modelIdentifier) {
        if (modelIdentifier == null || modelIdentifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Model identifier is required");
        }
        return modelIdentifier.trim();
    }

    private User findBuyer(Long buyerId) {
        return userRepository.findById(buyerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Buyer not found"));
    }

    private Product findProduct(Long productId) {
        return productRepository.findById(productId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private TryOnUsage findOrCreateUsage(User buyer, Product product) {
        return tryOnUsageRepository.findByBuyerIdAndProductId(buyer.getId(), product.getId())
            .orElseGet(() -> {
                TryOnUsage usage = new TryOnUsage();
                usage.setBuyer(buyer);
                usage.setProduct(product);
                usage.setGenerationCount(0);
                return usage;
            });
    }

    private void enforceFreeTierLimit(boolean proUser, TryOnUsage usage) {
        if (!proUser && usage.getGenerationCount() >= FREE_GENERATION_LIMIT_PER_PRODUCT) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Free users can generate one try-on per product");
        }
    }

    private void incrementUsage(TryOnUsage usage) {
        usage.setGenerationCount(usage.getGenerationCount() + 1);
        tryOnUsageRepository.save(usage);
    }

    private void persistImage(TryOnUsage usage, String imageUrl, String modelIdentifier) {
        TryOnImage image = new TryOnImage();
        image.setUsage(usage);
        image.setImageUrl(imageUrl);
        image.setModelIdentifier(modelIdentifier);
        image.setGeneratedAt(Instant.now());
        tryOnImageRepository.save(image);
    }
}
