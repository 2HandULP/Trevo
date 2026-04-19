package pt.trevo.trevo_api.service;

import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.http.HttpStatus;
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
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;

@RestController
@RequestMapping("/api/shops")
public class ShopController {

    private final ShopService shopService;

    public ShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShopResponse createShop(
        @Valid @RequestBody CreateShopRequest request,
        Authentication authentication
    ) {
        Long callerId = (Long) authentication.getPrincipal();
        Role callerRole = (Role) authentication.getAuthorities().stream()
            .findFirst()
            .map(auth -> Role.valueOf(auth.getAuthority().substring("ROLE_".length())))
            .orElseThrow(() -> new IllegalStateException("No role found in authentication"));

        Shop shop = shopService.createShop(callerId, callerRole, request);
        return toResponse(shop);
    }

    @PutMapping("/{shopId}")
    public ShopResponse updateShop(
        @PathVariable Long shopId,
        @RequestParam(required = false) String description,
        @RequestParam(required = false) MultipartFile logo,
        @RequestParam(required = false) MultipartFile banner,
        Authentication authentication
    ) throws IOException {
        Long callerId = (Long) authentication.getPrincipal();

        UpdateShopRequest request = new UpdateShopRequest(description, logo, banner);
        Shop shop = shopService.updateShop(callerId, shopId, request);
        return toResponse(shop);
    }

    @PostMapping("/{shopId}/deactivate")
    public ShopResponse deactivateShop(@PathVariable Long shopId) {
        Shop shop = shopService.deactivateShop(shopId);
        return toResponse(shop);
    }

    @PostMapping("/{shopId}/reactivate")
    public ShopResponse reactivateShop(@PathVariable Long shopId) {
        Shop shop = shopService.reactivateShop(shopId);
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
