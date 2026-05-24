package pt.trevo.trevo_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TryOnRequest(
    @NotNull Long productId,
    @NotBlank String modelIdentifier
) {
}
