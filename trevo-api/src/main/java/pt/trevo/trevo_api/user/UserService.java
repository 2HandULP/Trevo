package pt.trevo.trevo_api.user;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;

    public UserService(UserRepository userRepository, ShopRepository shopRepository) {
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Shop shop = shopRepository.findByOwnerId(userId).orElse(null);

        return new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getPhone(),
            user.getRole(),
            user.getStatus(),
            shop != null ? shop.getName() : null,
            shop != null ? shop.getStatus() : null
        );
    }
}
