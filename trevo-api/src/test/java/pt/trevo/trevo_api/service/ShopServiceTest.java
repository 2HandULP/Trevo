package pt.trevo.trevo_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.BaseUnitTest;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;

class ShopServiceTest extends BaseUnitTest {

    @Mock
    private ShopRepository shopRepository;

    @InjectMocks
    private ShopService shopService;

    @Test
    void createShopCreatesShopForShopOwner() {
        Long ownerId = 11L;
        CreateShopRequest request = new CreateShopRequest("My Shop", "A description", "123456789", null, null);

        when(shopRepository.findByOwnerId(ownerId)).thenReturn(Optional.empty());
        when(shopRepository.findByNif("123456789")).thenReturn(Optional.empty());
        when(shopRepository.save(any(Shop.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Shop created = shopService.createShop(ownerId, Role.SHOP_OWNER, request);

        assertThat(created.getOwner()).isNotNull();
        assertThat(created.getOwner().getId()).isEqualTo(ownerId);
        assertThat(created.getName()).isEqualTo("My Shop");
        verify(shopRepository).save(created);
    }

    @Test
    void createShopThrowsConflictWhenOwnerAlreadyHasShop() {
        Long ownerId = 11L;
        CreateShopRequest request = new CreateShopRequest("My Shop", "A description", "123456789", null, null);

        when(shopRepository.findByOwnerId(ownerId)).thenReturn(Optional.of(Shop.builder().id(5L).owner(User.builder().id(ownerId).build()).build()));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
            shopService.createShop(ownerId, Role.SHOP_OWNER, request)
        );

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    void createShopThrowsForbiddenForNonShopOwner() {
        Long userId = 22L;
        CreateShopRequest request = new CreateShopRequest("My Shop", "A description", "123456789", null, null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
            shopService.createShop(userId, Role.BUYER, request)
        );

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(shopRepository, never()).findByOwnerId(any());
        verify(shopRepository, never()).save(any(Shop.class));
    }
}
