package pt.trevo.trevo_api.service;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReplicateApiClient {

    private static final Logger log = LoggerFactory.getLogger(ReplicateApiClient.class);
    private static final String REPLICATE_API_BASE = "https://api.replicate.com/v1";

    private final String apiToken;
    private final String modelVersion;
    private final long pollIntervalMs;
    private final long timeoutMs;
    private final RestClient restClient;
    private volatile String cachedLatestVersion;

    public ReplicateApiClient(
        @Value("${replicate.api-token:}") String apiToken,
        @Value("${replicate.model-version:}") String modelVersion,
        @Value("${replicate.poll-interval-ms:2000}") long pollIntervalMs,
        @Value("${replicate.timeout-ms:60000}") long timeoutMs
    ) {
        this.apiToken = apiToken;
        this.modelVersion = modelVersion;
        this.pollIntervalMs = pollIntervalMs;
        this.timeoutMs = timeoutMs;
        this.restClient = RestClient.builder()
            .baseUrl(REPLICATE_API_BASE)
            .build();
    }

    public String createAndAwaitPrediction(String garmentImageUrl, String humanImageUrl, String garmentDescription) {
        ensureConfigured();
        String predictionUrl = createPrediction(garmentImageUrl, humanImageUrl, garmentDescription);
        return pollUntilComplete(predictionUrl);
    }

    private void ensureConfigured() {
        if (apiToken == null || apiToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation API is not configured");
        }
    }

    @SuppressWarnings("unchecked")
    private String resolveVersion() {
        if (modelVersion != null && !modelVersion.isBlank()) {
            return modelVersion;
        }
        if (cachedLatestVersion != null) {
            return cachedLatestVersion;
        }
        try {
            Map<String, Object> model = restClient.get()
                .uri("/models/cuuupid/idm-vton")
                .header("Authorization", "Bearer " + apiToken)
                .retrieve()
                .body(Map.class);
            if (model != null && model.get("latest_version") instanceof Map<?, ?> lv) {
                cachedLatestVersion = (String) lv.get("id");
                return cachedLatestVersion;
            }
        } catch (RestClientException ex) {
            log.warn("Failed to fetch latest model version", ex);
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not resolve IDM-VTON model version");
    }

    private String createPrediction(String garmentImageUrl, String humanImageUrl, String garmentDescription) {
        Map<String, Object> input = Map.of(
            "garm_img", garmentImageUrl,
            "human_img", humanImageUrl,
            "garment_des", garmentDescription,
            "category", "upper_body"
        );

        String version = resolveVersion();
        Map<String, Object> body = Map.of("version", version, "input", input);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                .uri("/predictions")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + apiToken)
                .body(body)
                .retrieve()
                .body(Map.class);

            if (response == null || !response.containsKey("urls")) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Replicate API returned unexpected response");
            }

            @SuppressWarnings("unchecked")
            Map<String, String> urls = (Map<String, String>) response.get("urls");
            return urls.get("get");
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (RestClientException ex) {
            log.error("Replicate prediction creation failed", ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation API request failed");
        }
    }

    @SuppressWarnings("unchecked")
    private String pollUntilComplete(String predictionUrl) {
        long deadline = System.currentTimeMillis() + timeoutMs;

        while (System.currentTimeMillis() < deadline) {
            try {
                Map<String, Object> response = restClient.get()
                    .uri(predictionUrl)
                    .header("Authorization", "Bearer " + apiToken)
                    .retrieve()
                    .body(Map.class);

                if (response == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Replicate API returned empty poll response");
                }

                String status = (String) response.get("status");

                if ("succeeded".equals(status)) {
                    Object output = response.get("output");
                    if (output instanceof List<?> outputList && !outputList.isEmpty()) {
                        return (String) outputList.getFirst();
                    }
                    if (output instanceof String outputStr) {
                        return outputStr;
                    }
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Replicate prediction succeeded but returned no output");
                }

                if ("failed".equals(status) || "canceled".equals(status)) {
                    String error = (String) response.getOrDefault("error", "Unknown error");
                    log.error("Replicate prediction {}: {}", status, error);
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation failed: " + error);
                }

                Thread.sleep(pollIntervalMs);
            } catch (ResponseStatusException ex) {
                throw ex;
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation interrupted");
            } catch (RestClientException ex) {
                log.error("Replicate poll request failed", ex);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation API request failed");
            }
        }

        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI image generation timed out");
    }
}
