package pt.trevo.trevo_api.user;

import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.Status;

public record UserProfileResponse(
    Long id,
    String email,
    String fullName,
    String phone,
    Role role,
    Status status,
    String shopName,
    ShopStatus shopStatus
) {
}
