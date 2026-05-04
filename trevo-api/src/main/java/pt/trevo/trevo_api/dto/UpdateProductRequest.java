package pt.trevo.trevo_api.dto;

import java.math.BigDecimal;

public record UpdateProductRequest(
    String name,
    String description,
    BigDecimal price,
    String brand,
    String materials
) {
}
