package pt.trevo.trevo_api.service;

public record CreateShopRequest(
    String name,
    String description,
    String nif,
    String logoUrl,
    String bannerUrl
) {
}
