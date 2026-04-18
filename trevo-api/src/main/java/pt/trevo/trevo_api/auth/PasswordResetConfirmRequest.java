package pt.trevo.trevo_api.auth;

import jakarta.validation.constraints.NotBlank;

public record PasswordResetConfirmRequest(
    @NotBlank String token,
    @NotBlank String newPassword
) {
}
