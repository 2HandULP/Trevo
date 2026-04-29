package pt.trevo.trevo_api.dto;

import pt.trevo.trevo_api.persistence.entity.ProductStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ProductResponse(
    Long id,
    Long shopId,
    String name,
    String description,
    BigDecimal price,
    String brand,
    String materials,
    ProductStatus status,
    List<VariantResponse> variants,
    LocalDateTime createdAt
) {}
