package pt.trevo.trevo_api.service;

import java.io.IOException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;

@Service
public class ShopService {

    private final ShopRepository shopRepository;
    private final ImageService imageService;

    public ShopService(ShopRepository shopRepository, ImageService imageService) {
        this.shopRepository = shopRepository;
        this.imageService = imageService;
    }

    @Transactional
    public Shop createShop(Long callerId, Role callerRole, CreateShopRequest request) {
        if (callerId == null || callerRole == null || request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid create shop request");
        }

        if (callerRole != Role.SHOP_OWNER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only shop owners can create shops");
        }

        if (shopRepository.findByOwnerId(callerId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Owner already has a shop");
        }

        // Optional: enforce unique NIF
        if (request.nif() != null && shopRepository.findByNif(request.nif()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NIF already in use");
        }

        Shop shop = Shop.builder()
            .owner(User.builder().id(callerId).build())
            .name(request.name())
            .description(request.description())
            .nif(request.nif())
            .logoUrl(request.logoUrl())
            .bannerUrl(request.bannerUrl())
            .status(ShopStatus.PENDING)
            .build();

        return shopRepository.save(shop);
    }

    @Transactional
    public Shop updateShop(Long callerId, Long shopId, UpdateShopRequest request) throws IOException {
        if (callerId == null || shopId == null || request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid update shop request");
        }

        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        if (!shop.getOwner().getId().equals(callerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only shop owner can update this shop");
        }

        if (request.description() != null) {
            shop.setDescription(request.description());
        }

        if (request.logo() != null && !request.logo().isEmpty()) {
            Map uploadResult = imageService.upload(request.logo());
            String logoUrl = (String) uploadResult.get("secure_url");
            shop.setLogoUrl(logoUrl);
        }

        if (request.banner() != null && !request.banner().isEmpty()) {
            Map uploadResult = imageService.upload(request.banner());
            String bannerUrl = (String) uploadResult.get("secure_url");
            shop.setBannerUrl(bannerUrl);
        }

        return shopRepository.save(shop);
    }

    @Transactional
    public Shop deactivateShop(Long shopId) {
        if (shopId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid shop id");
        }

        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        shop.setIsActive(false);
        return shopRepository.save(shop);
    }

    @Transactional
    public Shop reactivateShop(Long shopId) {
        if (shopId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid shop id");
        }

        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        shop.setIsActive(true);
        return shopRepository.save(shop);
    }
}
