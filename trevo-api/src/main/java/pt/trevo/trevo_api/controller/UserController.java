package pt.trevo.trevo_api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pt.trevo.trevo_api.dto.UpdateProfileRequest;
import pt.trevo.trevo_api.dto.UserProfileResponse;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.security.SecurityUtils;
import pt.trevo.trevo_api.service.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final SecurityUtils securityUtils;

    public UserController(UserService userService, SecurityUtils securityUtils) {
        this.userService = userService;
        this.securityUtils = securityUtils;
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public UserProfileResponse updateProfile(
        @Valid @RequestBody UpdateProfileRequest request,
        Authentication authentication
    ) {
        Long userId = securityUtils.requireUserId(authentication);
        User user = userService.updateProfile(userId, request);
        return new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getPhone(),
            user.getRole(),
            user.getStatus()
        );
    }
}
