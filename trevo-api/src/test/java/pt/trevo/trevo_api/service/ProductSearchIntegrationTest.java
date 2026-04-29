package pt.trevo.trevo_api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import pt.trevo.trevo_api.BaseIntegrationTest;
import pt.trevo.trevo_api.persistence.entity.Collection;
import pt.trevo.trevo_api.persistence.entity.Product;
import pt.trevo.trevo_api.persistence.entity.ProductStatus;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.Status;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.entity.Variant;
import pt.trevo.trevo_api.persistence.repository.CollectionRepository;
import pt.trevo.trevo_api.persistence.repository.ProductRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;
import pt.trevo.trevo_api.persistence.repository.VariantRepository;

@Transactional
class ProductSearchIntegrationTest extends BaseIntegrationTest {

    @Autowired private ProductService productService;
    @Autowired private ProductRepository productRepository;
    @Autowired private VariantRepository variantRepository;
    @Autowired private ShopRepository shopRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CollectionRepository collectionRepository;

    private Shop activeShop;
    private Shop deactivatedShop;
    private Product redDress;
    private Product blueJeans;
    private Product archivedShirt;
    private Product coatInDeactivatedShop;
    private Collection dressesCollection;

    @BeforeEach
    void setUp() {
        User owner1 = userRepository.save(User.builder()
            .email("search.owner1@test.com")
            .passwordHash("hash")
            .fullName("Owner One")
            .role(Role.SHOP_OWNER)
            .status(Status.ACTIVE)
            .build());

        User owner2 = userRepository.save(User.builder()
            .email("search.owner2@test.com")
            .passwordHash("hash")
            .fullName("Owner Two")
            .role(Role.SHOP_OWNER)
            .status(Status.ACTIVE)
            .build());

        activeShop = shopRepository.save(Shop.builder()
            .owner(owner1)
            .name("Active Shop")
            .nif("911111111")
            .status(ShopStatus.ACTIVE)
            .build());

        deactivatedShop = shopRepository.save(Shop.builder()
            .owner(owner2)
            .name("Deactivated Shop")
            .nif("922222222")
            .status(ShopStatus.DEACTIVATED)
            .build());

        redDress = productRepository.save(Product.builder()
            .shop(activeShop)
            .name("Red Dress")
            .description("An elegant evening gown")
            .price(new BigDecimal("50.00"))
            .brand("Test Brand")
            .status(ProductStatus.ACTIVE)
            .build());

        blueJeans = productRepository.save(Product.builder()
            .shop(activeShop)
            .name("Blue Jeans")
            .description("Casual denim wear")
            .price(new BigDecimal("30.00"))
            .brand("Test Brand")
            .status(ProductStatus.ACTIVE)
            .build());

        archivedShirt = productRepository.save(Product.builder()
            .shop(activeShop)
            .name("White Shirt")
            .description("Office shirt")
            .price(new BigDecimal("20.00"))
            .brand("Test Brand")
            .status(ProductStatus.ARCHIVED)
            .build());

        coatInDeactivatedShop = productRepository.save(Product.builder()
            .shop(deactivatedShop)
            .name("Purple Coat")
            .description("Warm winter coat")
            .price(new BigDecimal("100.00"))
            .brand("Test Brand")
            .status(ProductStatus.ACTIVE)
            .build());

        variantRepository.save(Variant.builder()
            .product(redDress).size("M").color("Red").stock(5).build());

        variantRepository.save(Variant.builder()
            .product(blueJeans).size("L").color("Blue").stock(3).build());

        variantRepository.save(Variant.builder()
            .product(coatInDeactivatedShop).size("S").color("Purple").stock(2).build());

        dressesCollection = collectionRepository.save(Collection.builder()
            .shop(activeShop).name("Dresses").displayOrder(0).build());

        redDress = productService.assignToCollections(owner1.getId(), redDress.getId(), List.of(dressesCollection.getId()));
    }

    // ── PROD-B05: search ─────────────────────────────────────────────────────

    @Test
    void searchByKeyword_matchesProductName() {
        List<Product> results = productService.searchProducts("dress", null, null, null, null);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(redDress.getId());
    }

    @Test
    void searchByKeyword_matchesProductDescription() {
        List<Product> results = productService.searchProducts("elegant", null, null, null, null);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(redDress.getId());
    }

    @Test
    void searchByKeyword_isCaseInsensitive() {
        List<Product> results = productService.searchProducts("BLUE", null, null, null, null);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(blueJeans.getId());
    }

    @Test
    void searchWithMinPrice_excludesProductsBelowBound() {
        List<Product> results = productService.searchProducts(null, new BigDecimal("35.00"), null, null, null);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(redDress.getId());
    }

    @Test
    void searchWithMaxPrice_excludesProductsAboveBound() {
        List<Product> results = productService.searchProducts(null, null, new BigDecimal("35.00"), null, null);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(blueJeans.getId());
    }

    @Test
    void searchWithPriceRange_returnsProductsWithinBounds() {
        List<Product> results = productService.searchProducts(null, new BigDecimal("25.00"), new BigDecimal("55.00"), null, null);

        assertThat(results).extracting(Product::getId)
            .containsExactlyInAnyOrder(redDress.getId(), blueJeans.getId());
    }

    @Test
    void searchWithSize_narrowsResultsToMatchingVariants() {
        List<Product> results = productService.searchProducts(null, null, null, "M", null);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(redDress.getId());
    }

    @Test
    void searchWithColor_narrowsResultsToMatchingVariants() {
        List<Product> results = productService.searchProducts(null, null, null, null, "Blue");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(blueJeans.getId());
    }

    @Test
    void searchWithSizeAndColor_requiresBothToMatchSameVariant() {
        List<Product> results = productService.searchProducts(null, null, null, "M", "Red");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(redDress.getId());
    }

    @Test
    void searchWithNoFilters_returnsOnlyActiveProductsFromActiveShops() {
        List<Product> results = productService.searchProducts(null, null, null, null, null);

        assertThat(results).extracting(Product::getId)
            .containsExactlyInAnyOrder(redDress.getId(), blueJeans.getId());
    }

    @Test
    void search_excludesArchivedProducts() {
        List<Product> results = productService.searchProducts("shirt", null, null, null, null);

        assertThat(results).isEmpty();
    }

    @Test
    void search_excludesProductsFromDeactivatedShops() {
        List<Product> results = productService.searchProducts("coat", null, null, null, null);

        assertThat(results).isEmpty();
    }

    // ── PROD-B06: browse by shop ─────────────────────────────────────────────

    @Test
    void browseByShop_returnsOnlyActiveProductsForShop() {
        Page<Product> page = productService.findActiveByShop(activeShop.getId(), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(Product::getId)
            .containsExactlyInAnyOrder(redDress.getId(), blueJeans.getId());
    }

    @Test
    void browseByShop_excludesArchivedProducts() {
        Page<Product> page = productService.findActiveByShop(activeShop.getId(), PageRequest.of(0, 10));

        assertThat(page.getContent()).extracting(Product::getName)
            .doesNotContain("White Shirt");
    }

    @Test
    void browseByShop_returnsEmptyPageForDeactivatedShop() {
        Page<Product> page = productService.findActiveByShop(deactivatedShop.getId(), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isZero();
    }

    @Test
    void browseByShop_supportsPagination() {
        Page<Product> firstPage = productService.findActiveByShop(activeShop.getId(), PageRequest.of(0, 1));

        assertThat(firstPage.getTotalElements()).isEqualTo(2);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(firstPage.getContent()).hasSize(1);
    }

    // ── PROD-B06: browse by collection ──────────────────────────────────────

    @Test
    void browseByCollection_returnsOnlyProductsInThatCollection() {
        Page<Product> page = productService.findActiveByCollection(dressesCollection.getId(), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getId()).isEqualTo(redDress.getId());
    }

    @Test
    void browseByCollection_respectsActiveProductStatus() {
        productService.archiveProduct(activeShop.getOwner().getId(), redDress.getId());

        Page<Product> page = productService.findActiveByCollection(dressesCollection.getId(), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isZero();
    }

    @Test
    void browseByCollection_returnsEmptyForUnknownCollection() {
        Page<Product> page = productService.findActiveByCollection(99999L, PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isZero();
    }
}
