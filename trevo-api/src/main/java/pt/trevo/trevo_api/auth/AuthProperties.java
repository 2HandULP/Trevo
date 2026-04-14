package pt.trevo.trevo_api.auth;

import java.time.Duration;
import lombok.Builder;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Builder
@ConfigurationProperties(prefix = "app.security.auth")
public record AuthProperties(Duration refreshTokenExpiration) {

    public AuthProperties {
        if (refreshTokenExpiration == null) {
            refreshTokenExpiration = Duration.ofDays(30);
        }
    }
}
