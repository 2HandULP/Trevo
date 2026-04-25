package pt.trevo.trevo_api.controller;

import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pt.trevo.trevo_api.dto.CreateShopRequest;
import pt.trevo.trevo_api.dto.ShopResponse;
import pt.trevo.trevo_api.dto.UpdateShopRequest;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.security.SecurityUtils;
import pt.trevo.trevo_api.service.ShopService;

@RestController
@RequestMapping("/api/shops")
public class ShopController {

    private final ShopService shopService;
    private final SecurityUtils securityUtils;
    private final ImageUploadValidator imageUploadValidator;

    public ShopController(
        ShopService shopService,
        SecurityUtils securityUtils,
        ImageUploadValidator imageUploadValidator
    ) {
        this.shopService = shopService;
        this.securityUtils = securityUtils;
        this.imageUploadValidator = imageUploadValidator;
    }

    @PostMapping
    @PreAuthorize("hasRole('SHOP_OWNER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ShopResponse createShop(
        @Valid @RequestBody CreateShopRequest request,
        Authentication authentication
    ) {
        Long callerId = securityUtils.requireUserId(authentication);
        Shop shop = shopService.createShop(callerId, request);
        return toResponse(shop);
    }

    @PutMapping("/{shopId}")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ShopResponse updateShop(
        @PathVariable Long shopId,
        @RequestParam(required = false) String description,
        @RequestParam(required = false) MultipartFile logo,
        @RequestParam(required = false) MultipartFile banner,
        Authentication authentication
    ) throws IOException {
        imageUploadValidator.validateOptionalImage(logo, "logo");
        imageUploadValidator.validateOptionalImage(banner, "banner");

        Long callerId = securityUtils.requireUserId(authentication);
        UpdateShopRequest request = new UpdateShopRequest(description, logo, banner);
        Shop shop = shopService.updateShop(callerId, shopId, request);
        return toResponse(shop);
    }

    @PostMapping("/{shopId}/deactivate")
    @PreAuthorize("hasRole('SHOP_OWNER') or hasRole('ADMIN')")
    public ShopResponse deactivateShop(@PathVariable Long shopId, Authentication authentication) {
        Long callerId = securityUtils.requireUserId(authentication);
        boolean isAdmin = securityUtils.hasRole(authentication, Role.ADMIN);
        Shop shop = shopService.deactivateShop(shopId, callerId, isAdmin);
        return toResponse(shop);
    }

    @PostMapping("/{shopId}/reactivate")
    @PreAuthorize("hasRole('SHOP_OWNER') or hasRole('ADMIN')")
    public ShopResponse reactivateShop(@PathVariable Long shopId, Authentication authentication) {
        Long callerId = securityUtils.requireUserId(authentication);
        boolean isAdmin = securityUtils.hasRole(authentication, Role.ADMIN);
        Shop shop = shopService.reactivateShop(shopId, callerId, isAdmin);
        return toResponse(shop);
    }

    private ShopResponse toResponse(Shop shop) {
        return new ShopResponse(
            shop.getId(),
            shop.getOwner().getId(),
            shop.getName(),
            shop.getDescription(),
            shop.getNif(),
            shop.getLogoUrl(),
            shop.getBannerUrl(),
            shop.getStatus()
        );
    }
}
