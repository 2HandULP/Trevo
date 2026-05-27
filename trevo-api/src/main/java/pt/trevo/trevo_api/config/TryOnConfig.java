package pt.trevo.trevo_api.config;

import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.ai.try-on")
public record TryOnConfig(Map<String, String> modelPhotos) {

    public TryOnConfig {
        if (modelPhotos == null) {
            modelPhotos = Map.of();
        }
    }
}
