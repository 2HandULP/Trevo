package pt.trevo.trevo_api.service;

import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.dto.MbWayPaymentRequestResponse;

@Component
public class MbWayRestPaymentsClient implements MbWayPaymentsClient {

    private final RestClient restClient;
    private final String apiKey;

    public MbWayRestPaymentsClient(
        @Value("${MBWAY_BASE_URL:https://api.example-mbway-provider.test}") String baseUrl,
        @Value("${MBWAY_API_KEY:}") String apiKey
    ) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.apiKey = apiKey;
    }

    @Override
    public MbWayPaymentRequestResponse createPaymentRequest(
        Long orderId,
        BigDecimal amount,
        String currency,
        String phoneNumber
    ) {
        assertConfigured();

        try {
            MbWayPaymentRequestResponse response = restClient.post()
                .uri("/payments/mbway")
                .headers(headers -> headers.setBearerAuth(apiKey))
                .contentType(MediaType.APPLICATION_JSON)
                .body(new MbWayPaymentRequest(orderId.toString(), amount.toPlainString(), currency, phoneNumber))
                .retrieve()
                .body(MbWayPaymentRequestResponse.class);

            if (response == null || response.reference() == null || response.reference().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "MB WAY payment request failed");
            }

            return response;
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "MB WAY payment request failed", ex);
        }
    }

    private void assertConfigured() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "MB WAY API key is not configured");
        }
    }

    private record MbWayPaymentRequest(
        String orderId,
        String amount,
        String currency,
        String phoneNumber
    ) {
    }
}
