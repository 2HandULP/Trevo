package pt.trevo.trevo_api.service;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.dto.PayPalCaptureResponse;
import pt.trevo.trevo_api.dto.PayPalOrderResponse;

@Component
public class PayPalRestOrdersClient implements PayPalOrdersClient {

    private static final String CAPTURE_INTENT = "CAPTURE";
    private static final String APPROVE_REL = "approve";

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;

    public PayPalRestOrdersClient(
        @Value("${PAYPAL_BASE_URL:https://api-m.sandbox.paypal.com}") String baseUrl,
        @Value("${PAYPAL_CLIENT_ID:}") String clientId,
        @Value("${PAYPAL_CLIENT_SECRET:}") String clientSecret
    ) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    @Override
    public PayPalOrderResponse createOrder(Long orderId, BigDecimal amount, String currency) {
        assertConfigured();

        try {
            PayPalCreateOrderApiResponse response = restClient.post()
                .uri("/v2/checkout/orders")
                .headers(headers -> headers.setBearerAuth(accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(new PayPalCreateOrderRequest(
                    CAPTURE_INTENT,
                    List.of(new PayPalPurchaseUnit(
                        orderId.toString(),
                        new PayPalAmount(currency, amount.toPlainString())
                    ))
                ))
                .retrieve()
                .body(PayPalCreateOrderApiResponse.class);

            if (response == null || response.id() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayPal create order failed");
            }

            return new PayPalOrderResponse(response.id(), response.status(), approveUrl(response.links()));
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayPal create order failed", ex);
        }
    }

    @Override
    public PayPalCaptureResponse captureOrder(String paypalOrderId) {
        assertConfigured();

        try {
            PayPalCaptureApiResponse response = restClient.post()
                .uri("/v2/checkout/orders/{id}/capture", paypalOrderId)
                .headers(headers -> headers.setBearerAuth(accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .retrieve()
                .body(PayPalCaptureApiResponse.class);

            if (response == null || response.id() == null || response.status() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayPal capture failed");
            }

            return new PayPalCaptureResponse(response.id(), response.status());
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayPal capture failed", ex);
        }
    }

    private String accessToken() {
        PayPalAccessTokenResponse response = restClient.post()
            .uri("/v1/oauth2/token")
            .headers(headers -> headers.setBasicAuth(clientId, clientSecret))
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body("grant_type=client_credentials")
            .retrieve()
            .body(PayPalAccessTokenResponse.class);

        if (response == null || response.accessToken() == null || response.accessToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayPal access token request failed");
        }

        return response.accessToken();
    }

    private void assertConfigured() {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "PayPal credentials are not configured");
        }
    }

    private String approveUrl(List<PayPalLink> links) {
        if (links == null) {
            return null;
        }

        return links.stream()
            .filter(link -> APPROVE_REL.equals(link.rel()))
            .map(PayPalLink::href)
            .findFirst()
            .orElse(null);
    }

    private record PayPalAccessTokenResponse(
        @com.fasterxml.jackson.annotation.JsonProperty("access_token") String accessToken
    ) {
    }

    private record PayPalCreateOrderRequest(
        String intent,
        @com.fasterxml.jackson.annotation.JsonProperty("purchase_units") List<PayPalPurchaseUnit> purchaseUnits
    ) {
    }

    private record PayPalPurchaseUnit(
        @com.fasterxml.jackson.annotation.JsonProperty("reference_id") String referenceId,
        PayPalAmount amount
    ) {
    }

    private record PayPalAmount(
        @com.fasterxml.jackson.annotation.JsonProperty("currency_code") String currencyCode,
        String value
    ) {
    }

    private record PayPalCreateOrderApiResponse(String id, String status, List<PayPalLink> links) {
    }

    private record PayPalCaptureApiResponse(String id, String status) {
    }

    private record PayPalLink(String href, String rel) {
    }
}
