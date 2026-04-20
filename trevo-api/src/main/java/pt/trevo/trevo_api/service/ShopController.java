package pt.trevo.trevo_api.service;

import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;

@RestController
@RequestMapping("/api/shops")
@PreAuthorize("hasRole('SHOP_OWNER')")
public class ShopController {

    private final ShopService shopService;

    public ShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShopResponse createShop(
        @Valid @RequestBody CreateShopRequest request,
        @AuthenticationPrincipal Long callerId
    ) {
        Shop shop = shopService.createShop(callerId, request);
        return toResponse(shop);
    }

    @PutMapping("/{shopId}")
    public ShopResponse updateShop(
        @PathVariable Long shopId,
        @RequestParam(required = false) String description,
        @RequestParam(required = false) MultipartFile logo,
        @RequestParam(required = false) MultipartFile banner,
        @AuthenticationPrincipal Long callerId
    ) throws IOException {
        UpdateShopRequest request = new UpdateShopRequest(description, logo, banner);
        Shop shop = shopService.updateShop(callerId, shopId, request);
        return toResponse(shop);
    }

    @PostMapping("/{shopId}/deactivate")
    @PreAuthorize("hasRole('SHOP_OWNER') or hasRole('ADMIN')")
    public ShopResponse deactivateShop(@PathVariable Long shopId, @AuthenticationPrincipal Long callerId) {
        Shop shop = shopService.deactivateShop(shopId, callerId);
        return toResponse(shop);
    }

    @PostMapping("/{shopId}/reactivate")
    @PreAuthorize("hasRole('SHOP_OWNER') or hasRole('ADMIN')")
    public ShopResponse reactivateShop(@PathVariable Long shopId, @AuthenticationPrincipal Long callerId) {
        Shop shop = shopService.reactivateShop(shopId, callerId);
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
