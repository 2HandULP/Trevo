package pt.trevo.trevo_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.BaseUnitTest;
import pt.trevo.trevo_api.dto.TryOnImageResponse;
import pt.trevo.trevo_api.persistence.entity.Product;
import pt.trevo.trevo_api.persistence.entity.ProductStatus;
import pt.trevo.trevo_api.persistence.entity.TryOnImage;
import pt.trevo.trevo_api.persistence.entity.TryOnUsage;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.ProductRepository;
import pt.trevo.trevo_api.persistence.repository.TryOnImageRepository;
import pt.trevo.trevo_api.persistence.repository.TryOnUsageRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

class TryOnServiceTest extends BaseUnitTest {

    @Mock private AiImageGenerationClient aiImageGenerationClient;
    @Mock private ProductRepository productRepository;
    @Mock private TryOnImageRepository tryOnImageRepository;
    @Mock private TryOnUsageRepository tryOnUsageRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserPhotoInput userPhotoInput;
    @Mock private SubscriptionService subscriptionService;

    @Test
    void generateTryOnAllowsFreeUserFirstGenerationForProductAndStoresImageUrl() {
        User buyer = buyer(10L);
        Product product = product(20L);
        when(subscriptionService.isProUser(10L)).thenReturn(false);
        when(userRepository.findById(10L)).thenReturn(Optional.of(buyer));
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(tryOnUsageRepository.findByBuyerIdAndProductId(10L, 20L)).thenReturn(Optional.empty());
        when(tryOnImageRepository.findFirstCached(20L, "classic-model")).thenReturn(Optional.empty());
        when(aiImageGenerationClient.generateTryOn(product, "classic-model")).thenReturn("https://ai.example/try-on-1.png");
        when(tryOnUsageRepository.save(any(TryOnUsage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tryOnImageRepository.save(any(TryOnImage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TryOnImageResponse response = service().generateTryOn(10L, 20L, "classic-model");

        assertThat(response.imageUrl()).isEqualTo("https://ai.example/try-on-1.png");
        ArgumentCaptor<TryOnUsage> usageCaptor = ArgumentCaptor.forClass(TryOnUsage.class);
        verify(tryOnUsageRepository).save(usageCaptor.capture());
        assertThat(usageCaptor.getValue().getBuyer()).isSameAs(buyer);
        assertThat(usageCaptor.getValue().getProduct()).isSameAs(product);
        assertThat(usageCaptor.getValue().getGenerationCount()).isEqualTo(1);

        ArgumentCaptor<TryOnImage> imageCaptor = ArgumentCaptor.forClass(TryOnImage.class);
        verify(tryOnImageRepository).save(imageCaptor.capture());
        assertThat(imageCaptor.getValue().getImageUrl()).isEqualTo("https://ai.example/try-on-1.png");
        assertThat(imageCaptor.getValue().getModelIdentifier()).isEqualTo("classic-model");
        assertThat(imageCaptor.getValue().getUsage()).isSameAs(usageCaptor.getValue());
    }

    @Test
    void generateTryOnRejectsSecondFreeGenerationForSameProductWithPaymentRequired() {
        TryOnUsage existingUsage = usage(buyer(10L), product(20L), 1);
        when(subscriptionService.isProUser(10L)).thenReturn(false);
        when(userRepository.findById(10L)).thenReturn(Optional.of(existingUsage.getBuyer()));
        when(productRepository.findById(20L)).thenReturn(Optional.of(existingUsage.getProduct()));
        when(tryOnUsageRepository.findByBuyerIdAndProductId(10L, 20L)).thenReturn(Optional.of(existingUsage));

        Throwable thrown = catchThrowable(() -> service().generateTryOn(10L, 20L, "classic-model"));

        assertThat(thrown).isInstanceOf(ResponseStatusException.class);
        ResponseStatusException exception = (ResponseStatusException) thrown;
        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
        assertThat(exception.getReason()).isEqualTo("Free users can generate one try-on per product");
        verify(aiImageGenerationClient, never()).generateTryOn(any(), any());
        verify(tryOnImageRepository, never()).save(any());
    }

    @Test
    void generateTryOnAllowsProUserMultipleGenerationsForSameProduct() {
        User buyer = buyer(10L);
        Product product = product(20L);
        TryOnUsage usage = usage(buyer, product, 1);
        when(subscriptionService.isProUser(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(buyer));
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(tryOnUsageRepository.findByBuyerIdAndProductId(10L, 20L)).thenReturn(Optional.of(usage));
        when(tryOnImageRepository.findFirstCached(20L, "front-model")).thenReturn(Optional.empty());
        when(tryOnImageRepository.findFirstCached(20L, "side-model")).thenReturn(Optional.empty());
        when(aiImageGenerationClient.generateTryOn(product, "front-model")).thenReturn("https://ai.example/front.png");
        when(aiImageGenerationClient.generateTryOn(product, "side-model")).thenReturn("https://ai.example/side.png");
        when(tryOnUsageRepository.save(any(TryOnUsage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tryOnImageRepository.save(any(TryOnImage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TryOnImageResponse first = service().generateTryOn(10L, 20L, "front-model");
        TryOnImageResponse second = service().generateTryOn(10L, 20L, "side-model");

        assertThat(first.imageUrl()).isEqualTo("https://ai.example/front.png");
        assertThat(second.imageUrl()).isEqualTo("https://ai.example/side.png");
        assertThat(usage.getGenerationCount()).isEqualTo(3);
        verify(aiImageGenerationClient).generateTryOn(product, "front-model");
        verify(aiImageGenerationClient).generateTryOn(product, "side-model");
    }

    @Test
    void generatePersonalizedTryOnRejectsNonProUserBeforeAnyOtherLogic() {
        when(subscriptionService.isProUser(10L)).thenReturn(false);

        Throwable thrown = catchThrowable(() -> service().generatePersonalizedTryOn(10L, 20L, photos(3)));

        assertThat(thrown).isInstanceOf(ResponseStatusException.class);
        ResponseStatusException exception = (ResponseStatusException) thrown;
        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(exception.getReason()).isEqualTo("Personalized try-on requires a Pro subscription");
        verify(productRepository, never()).findById(any());
        verify(aiImageGenerationClient, never()).generatePersonalizedTryOn(any(), any());
    }

    @Test
    void generatePersonalizedTryOnRejectsProUserWithFewerThanThreePhotos() {
        when(subscriptionService.isProUser(10L)).thenReturn(true);

        Throwable thrown = catchThrowable(() -> service().generatePersonalizedTryOn(10L, 20L, photos(2)));

        assertThat(thrown).isInstanceOf(ResponseStatusException.class);
        ResponseStatusException exception = (ResponseStatusException) thrown;
        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.getReason()).isEqualTo("Exactly 3 photos are required");
        verify(productRepository, never()).findById(any());
        verify(aiImageGenerationClient, never()).generatePersonalizedTryOn(any(), any());
    }

    @Test
    void generatePersonalizedTryOnForProUserWithExactlyThreePhotosTriggersAiGeneration() {
        User buyer = buyer(10L);
        Product product = product(20L);
        List<UserPhotoInput> photos = photos(3);
        when(subscriptionService.isProUser(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(buyer));
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(tryOnUsageRepository.findByBuyerIdAndProductId(10L, 20L)).thenReturn(Optional.empty());
        when(aiImageGenerationClient.generatePersonalizedTryOn(product, photos)).thenReturn("https://ai.example/personalized.png");
        when(tryOnUsageRepository.save(any(TryOnUsage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tryOnImageRepository.save(any(TryOnImage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TryOnImageResponse response = service().generatePersonalizedTryOn(10L, 20L, photos);

        assertThat(response.imageUrl()).isEqualTo("https://ai.example/personalized.png");
        verify(aiImageGenerationClient).generatePersonalizedTryOn(product, photos);
        verify(tryOnImageRepository).save(any(TryOnImage.class));
    }

    @Test
    void generateTryOnFirstCallForProductModelPairCallsAiAndStoresResultInCache() {
        User buyer = buyer(10L);
        Product product = product(20L);
        when(subscriptionService.isProUser(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(buyer));
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(tryOnUsageRepository.findByBuyerIdAndProductId(10L, 20L)).thenReturn(Optional.empty());
        when(tryOnImageRepository.findFirstCached(20L, "model-a")).thenReturn(Optional.empty());
        when(aiImageGenerationClient.generateTryOn(product, "model-a")).thenReturn("https://ai.example/model-a.png");
        when(tryOnUsageRepository.save(any(TryOnUsage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tryOnImageRepository.save(any(TryOnImage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TryOnImageResponse response = service().generateTryOn(10L, 20L, "model-a");

        assertThat(response.imageUrl()).isEqualTo("https://ai.example/model-a.png");
        verify(aiImageGenerationClient).generateTryOn(product, "model-a");
        verify(tryOnImageRepository).save(any(TryOnImage.class));
    }

    @Test
    void generateTryOnSecondCallForSameProductModelPairReturnsCachedUrlWithoutCallingAi() {
        User buyer = buyer(10L);
        Product product = product(20L);
        TryOnUsage usage = usage(buyer, product, 1);
        TryOnImage cachedImage = new TryOnImage();
        cachedImage.setImageUrl("https://ai.example/cached.png");
        cachedImage.setModelIdentifier("model-a");
        when(subscriptionService.isProUser(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(buyer));
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(tryOnUsageRepository.findByBuyerIdAndProductId(10L, 20L)).thenReturn(Optional.of(usage));
        when(tryOnImageRepository.findFirstCached(20L, "model-a")).thenReturn(Optional.of(cachedImage));
        when(tryOnUsageRepository.save(any(TryOnUsage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tryOnImageRepository.save(any(TryOnImage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TryOnImageResponse response = service().generateTryOn(10L, 20L, "model-a");

        assertThat(response.imageUrl()).isEqualTo("https://ai.example/cached.png");
        verify(aiImageGenerationClient, never()).generateTryOn(any(), any());
    }

    private TryOnService service() {
        return new TryOnService(
            aiImageGenerationClient,
            productRepository,
            tryOnImageRepository,
            tryOnUsageRepository,
            userRepository,
            subscriptionService
        );
    }

    private User buyer(Long id) {
        return User.builder().id(id).email("buyer@example.com").build();
    }

    private Product product(Long id) {
        return Product.builder()
            .id(id)
            .name("Linen Shirt")
            .price(new BigDecimal("49.99"))
            .status(ProductStatus.ACTIVE)
            .build();
    }

    private TryOnUsage usage(User buyer, Product product, int generationCount) {
        TryOnUsage usage = new TryOnUsage();
        usage.setBuyer(buyer);
        usage.setProduct(product);
        usage.setGenerationCount(generationCount);
        return usage;
    }

    private List<UserPhotoInput> photos(int count) {
        return java.util.stream.IntStream.rangeClosed(1, count)
            .mapToObj(index -> new MultipartUserPhotoInput(new MockMultipartFile(
                "photos",
                "photo-" + index + ".jpg",
                "image/jpeg",
                new byte[] {1, 2, 3}
            )))
            .map(UserPhotoInput.class::cast)
            .toList();
    }
}
