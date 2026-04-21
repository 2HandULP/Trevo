package pt.trevo.trevo_api.buyer;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@RestController
@RequestMapping("/api/buyer")
public class BuyerController {

    private final UserRepository userRepository;

    public BuyerController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public BuyerProfileResponse me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        return new BuyerProfileResponse(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getPhone(),
            user.getRole(),
            user.getStatus()
        );
    }
}
