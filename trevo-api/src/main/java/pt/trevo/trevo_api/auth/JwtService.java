package pt.trevo.trevo_api.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.User;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final Duration expiration;
    private final Clock clock;

    public JwtService(
        @Value("${app.security.jwt.secret}") String secret,
        @Value("${app.security.jwt.expiration}") Duration expiration
    ) {
        this(secret, expiration, Clock.systemUTC());
    }

    JwtService(String secret, Duration expiration, Clock clock) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
        this.clock = clock;
    }

    // Generates a signed access token carrying the authenticated user's identity and role.
    public String generateToken(User user) {
        Instant issuedAt = clock.instant();
        Instant expiresAt = issuedAt.plus(expiration);

        return Jwts.builder()
            .subject(String.valueOf(user.getId()))
            .claim("userId", user.getId())
            .claim("role", user.getRole().name())
            .issuedAt(Date.from(issuedAt))
            .expiration(Date.from(expiresAt))
            .signWith(signingKey)
            .compact();
    }

    public boolean validateToken(String token) {
        parseClaims(token);
        return true;
    }

    // Exposes the full JWT payload for callers that need more than the convenience accessors below.
    public Claims extractAllClaims(String token) {
        return parseClaims(token);
    }

    public Long extractUserId(String token) {
        return extractAllClaims(token).get("userId", Long.class);
    }

    public Role extractRole(String token) {
        String role = extractAllClaims(token).get("role", String.class);
        return Role.valueOf(role);
    }

    public Instant extractExpiration(String token) {
        return extractAllClaims(token).getExpiration().toInstant();
    }

    // Parsing is the single source of truth for signature and expiration validation.
    private Claims parseClaims(String token) throws JwtException {
        return Jwts.parser()
            .clock(() -> Date.from(clock.instant()))
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
