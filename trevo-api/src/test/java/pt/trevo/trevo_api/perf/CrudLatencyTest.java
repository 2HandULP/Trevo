package pt.trevo.trevo_api.perf;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pt.trevo.trevo_api.auth.JwtService;
import pt.trevo.trevo_api.dto.CreateProductRequest;
import pt.trevo.trevo_api.dto.UpdateProductRequest;
import pt.trevo.trevo_api.persistence.entity.Product;
import pt.trevo.trevo_api.persistence.entity.ProductStatus;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.Status;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.ProductRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CrudLatencyTest {

    private static final int WARMUP     = 10;
    private static final int ITERATIONS = 100;
    private static final long P95_MS    = 300;

    @Container
    @ServiceConnection
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("trevo_perf_crud")
        .withUsername("trevo")
        .withPassword("trevo");

    @Autowired private TestRestTemplate  restTemplate;
    @Autowired private JwtService        jwtService;
    @Autowired private UserRepository    userRepository;
    @Autowired private ShopRepository    shopRepository;
    @Autowired private ProductRepository productRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private HttpHeaders ownerHeaders;
    private Long        shopId;
    private Long        userId;
    private Long        productId;
    private String      createBody;
    private String      updateBody;

    @BeforeAll
    void setUp() throws Exception {
        User owner = userRepository.save(User.builder()
            .email("perf.crud.owner@test.com")
            .passwordHash("hash")
            .fullName("Perf Crud Owner")
            .role(Role.SHOP_OWNER)
            .status(Status.ACTIVE)
            .build());
        userId = owner.getId();

        Shop shop = shopRepository.save(Shop.builder()
            .owner(owner)
            .name("Perf Crud Shop")
            .nif("900000098")
            .status(ShopStatus.ACTIVE)
            .build());
        shopId = shop.getId();

        Product product = productRepository.save(Product.builder()
            .shop(shop)
            .name("Perf Product")
            .description("Performance test product")
            .price(new BigDecimal("29.99"))
            .brand("PerfBrand")
            .status(ProductStatus.ACTIVE)
            .build());
        productId = product.getId();

        ownerHeaders = new HttpHeaders();
        ownerHeaders.setBearerAuth(jwtService.generateToken(owner));
        ownerHeaders.setContentType(MediaType.APPLICATION_JSON);

        createBody = objectMapper.writeValueAsString(
            new CreateProductRequest("LatencyProduct", "Test", new BigDecimal("19.99"), "Brand", null));
        updateBody = objectMapper.writeValueAsString(
            new UpdateProductRequest("UpdatedName", null, null, null, null));
    }

    @AfterAll
    void cleanup() {
        productRepository.deleteAll(productRepository.findByShopId(shopId));
        shopRepository.deleteById(shopId);
        userRepository.deleteById(userId);
    }

    @Test
    void getProduct_p95Under300ms() {
        String url = "/api/products/" + productId;
        assertP95("GET " + url, () -> restTemplate.getForEntity(url, String.class));
    }

    @Test
    void searchProducts_p95Under300ms() {
        assertP95("GET /api/products/search",
            () -> restTemplate.getForEntity("/api/products/search?q=perf", String.class));
    }

    @Test
    void browseByShop_p95Under300ms() {
        String url = "/api/products?shopId=" + shopId;
        assertP95("GET " + url, () -> restTemplate.getForEntity(url, String.class));
    }

    @Test
    void createProduct_p95Under300ms() {
        HttpEntity<String> entity = new HttpEntity<>(createBody, ownerHeaders);
        assertP95("POST /api/products",
            () -> restTemplate.postForEntity("/api/products", entity, String.class));
    }

    @Test
    void updateProduct_p95Under300ms() {
        String url = "/api/products/" + productId;
        HttpEntity<String> entity = new HttpEntity<>(updateBody, ownerHeaders);
        assertP95("PUT " + url,
            () -> restTemplate.exchange(url, HttpMethod.PUT, entity, String.class));
    }

    private void assertP95(String label, Runnable action) {
        for (int i = 0; i < WARMUP; i++) {
            action.run();
        }

        long[] durations = new long[ITERATIONS];
        for (int i = 0; i < ITERATIONS; i++) {
            long start = System.nanoTime();
            action.run();
            durations[i] = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        }

        long p95 = p95(durations);
        assertThat(p95)
            .as("[%s] p95 was %dms, threshold %dms", label, p95, P95_MS)
            .isLessThan(P95_MS);
    }

    private static long p95(long[] durations) {
        long[] sorted = Arrays.copyOf(durations, durations.length);
        Arrays.sort(sorted);
        return sorted[(int)(sorted.length * 0.95)];
    }
}
