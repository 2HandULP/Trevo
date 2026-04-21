package pt.trevo.trevo_api.service;

import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@Service
public class ShopService {

    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    public ShopService(ShopRepository shopRepository, UserRepository userRepository, CloudinaryService cloudinaryService) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.cloudinaryService = cloudinaryService;
    }

    @Transactional
    public Shop createShop(Long callerId, CreateShopRequest request) {
        if (callerId == null || request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid create shop request");
        }

        if (shopRepository.findByOwnerId(callerId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Owner already has a shop");
        }

        // Optional: enforce unique NIF
        if (request.nif() != null && shopRepository.findByNif(request.nif()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NIF already in use");
        }

        Shop shop = Shop.builder()
            .owner(userRepository.getReferenceById(callerId))
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
            CloudinaryUploadResult uploadResult = cloudinaryService.uploadImage(request.logo());
            shop.setLogoUrl(uploadResult.url());
        }

        if (request.banner() != null && !request.banner().isEmpty()) {
            CloudinaryUploadResult uploadResult = cloudinaryService.uploadImage(request.banner());
            shop.setBannerUrl(uploadResult.url());
        }

        return shopRepository.save(shop);
    }

    @Transactional
    public Shop deactivateShop(Long shopId, Long callerId) {
        if (shopId == null || callerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid shop id or caller id");
        }

        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        if (!shop.getOwner().getId().equals(callerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only shop owner can deactivate this shop");
        }

        shop.setStatus(ShopStatus.DEACTIVATED);
        return shopRepository.save(shop);
    }

    @Transactional
    public Shop reactivateShop(Long shopId, Long callerId) {
        if (shopId == null || callerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid shop id or caller id");
        }

        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        if (!shop.getOwner().getId().equals(callerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only shop owner can reactivate this shop");
        }

        shop.setStatus(ShopStatus.ACTIVE);
        return shopRepository.save(shop);
    }
}
