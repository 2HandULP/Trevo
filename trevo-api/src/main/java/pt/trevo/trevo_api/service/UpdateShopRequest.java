package pt.trevo.trevo_api.service;

import org.springframework.web.multipart.MultipartFile;

public record UpdateShopRequest(
    String description,
    MultipartFile logo,
    MultipartFile banner
) {
}
