package pt.trevo.trevo_api.buyer;

import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Status;

public record BuyerProfileResponse(Long id, String email, String fullName, String phone, Role role, Status status) {
}
