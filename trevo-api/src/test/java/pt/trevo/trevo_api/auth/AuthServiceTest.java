package pt.trevo.trevo_api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.BaseUnitTest;
import pt.trevo.trevo_api.persistence.entity.PasswordResetToken;
import pt.trevo.trevo_api.persistence.entity.RefreshToken;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.Status;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.PasswordResetTokenRepository;
import pt.trevo.trevo_api.persistence.repository.RefreshTokenRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

class AuthServiceTest extends BaseUnitTest {

    private static final Instant NOW = Instant.parse("2026-04-14T10:15:30Z");

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordResetEmailSender passwordResetEmailSender;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
            userRepository,
            shopRepository,
            passwordResetTokenRepository,
            refreshTokenRepository,
            passwordEncoder,
            jwtService,
            passwordResetEmailSender,
            authenticationManager,
            Clock.fixed(NOW, ZoneOffset.UTC),
            AuthProperties.builder()
                .refreshTokenExpiration(java.time.Duration.ofDays(30))
                .build()
        );
    }

    @Test
    void validBuyerInputCreatesUserWithBuyerRoleAndBcryptHashedPassword() {
        RegisterBuyerRequest request = new RegisterBuyerRequest("buyer@example.com", "Secret123!", "Buyer Name", "912345678");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(request.password())).thenReturn("$2a$10$bcryptHash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(10L);
            return user;
        });

        User result = authService.registerBuyer(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(savedUser.getRole()).isEqualTo(Role.BUYER);
        assertThat(savedUser.getStatus()).isEqualTo(Status.ACTIVE);
        assertThat(savedUser.getPasswordHash()).isEqualTo("$2a$10$bcryptHash");
        assertThat(savedUser.getPasswordHash()).isNotEqualTo(request.password());
    }

    @Test
    void duplicateEmailThrowsConflict() {
        RegisterBuyerRequest request = new RegisterBuyerRequest("buyer@example.com", "Secret123!", "Buyer Name", "912345678");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(User.builder().id(1L).build()));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.registerBuyer(request));

        assertThat(exception.getStatusCode().value()).isEqualTo(409);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void nullBuyerRequestThrowsBadRequest() {
        RegisterBuyerRequest request = null;

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.registerBuyer(request));

        assertThat(exception.getStatusCode().value()).isEqualTo(400);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shortPasswordThrowsBadRequest() {
        RegisterBuyerRequest request = new RegisterBuyerRequest("buyer@example.com", "short", "Buyer Name", "912345678");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.registerBuyer(request));

        assertThat(exception.getStatusCode().value()).isEqualTo(400);
        assertThat(exception.getReason()).isEqualTo("Password must be at least 8 characters long");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void validShopOwnerInputWithNineDigitNifCreatesUserWithPendingStatus() {
        RegisterShopOwnerRequest request = new RegisterShopOwnerRequest(
            "shop@example.com",
            "Secret123!",
            "Shop Owner",
            "912345678",
            "Trevo Boutique",
            "123456789"
        );
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());
        when(shopRepository.findByNif(request.nif())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(request.password())).thenReturn("$2a$10$shopHash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(20L);
            return user;
        });

        User result = authService.registerShopOwner(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<Shop> shopCaptor = ArgumentCaptor.forClass(Shop.class);
        verify(userRepository).save(userCaptor.capture());
        verify(shopRepository).save(shopCaptor.capture());

        assertThat(result.getRole()).isEqualTo(Role.SHOP_OWNER);
        assertThat(result.getStatus()).isEqualTo(Status.PENDING);
        assertThat(userCaptor.getValue().getPasswordHash()).isEqualTo("$2a$10$shopHash");
        assertThat(shopCaptor.getValue().getNif()).isEqualTo("123456789");
        assertThat(shopCaptor.getValue().getStatus()).isEqualTo(ShopStatus.PENDING);
    }

    @Test
    void invalidNifFormatThrowsBadRequest() {
        RegisterShopOwnerRequest request = new RegisterShopOwnerRequest(
            "shop@example.com",
            "Secret123!",
            "Shop Owner",
            "912345678",
            "Trevo Boutique",
            "12345"
        );

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.registerShopOwner(request));

        assertThat(exception.getStatusCode().value()).isEqualTo(400);
        verify(userRepository, never()).save(any(User.class));
        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    void correctCredentialsReturnTokenPairAndPersistRefreshToken() {
        LoginRequest request = new LoginRequest("buyer@example.com", "Secret123!");
        User user = User.builder().id(30L).email("buyer@example.com").role(Role.BUYER).status(Status.ACTIVE).build();
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TokenPairResponse response = authService.login(request);

        verify(authenticationManager).authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(tokenCaptor.capture());
        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isNotBlank();
        assertThat(tokenCaptor.getValue().getToken()).isEqualTo(response.refreshToken());
        assertThat(tokenCaptor.getValue().getUser()).isEqualTo(user);
    }

    @Test
    void wrongPasswordThrowsUnauthorized() {
        LoginRequest request = new LoginRequest("buyer@example.com", "wrong-password");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
            .thenThrow(new BadCredentialsException("Bad credentials"));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.login(request));

        assertThat(exception.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void nonExistentEmailThrowsUnauthorized() {
        LoginRequest request = new LoginRequest("missing@example.com", "Secret123!");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
            .thenThrow(new BadCredentialsException("Bad credentials"));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.login(request));

        assertThat(exception.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void validRefreshTokenReturnsNewTokenPairAndRevokesOldToken() {
        User user = User.builder().id(40L).email("buyer@example.com").role(Role.BUYER).status(Status.ACTIVE).build();
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(user);
        storedToken.setToken("refresh-old");
        storedToken.setExpiresAt(NOW.plusSeconds(600));
        storedToken.setRevoked(false);
        storedToken.setCreatedAt(NOW.minusSeconds(60));

        when(refreshTokenRepository.findByTokenAndRevokedFalse("refresh-old")).thenReturn(Optional.of(storedToken));
        when(jwtService.generateToken(user)).thenReturn("access-new");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TokenPairResponse response = authService.refresh(new RefreshTokenRequest("refresh-old"));

        assertThat(response.accessToken()).isEqualTo("access-new");
        assertThat(response.refreshToken()).isNotEqualTo("refresh-old");
        assertThat(storedToken.getRevoked()).isTrue();
        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getToken()).isEqualTo(response.refreshToken());
    }

    @Test
    void expiredRefreshTokenThrowsUnauthorized() {
        User user = User.builder().id(41L).role(Role.BUYER).status(Status.ACTIVE).build();
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(user);
        storedToken.setToken("refresh-expired");
        storedToken.setExpiresAt(NOW.minusSeconds(1));
        storedToken.setRevoked(false);
        storedToken.setCreatedAt(NOW.minusSeconds(60));
        when(refreshTokenRepository.findByTokenAndRevokedFalse("refresh-expired")).thenReturn(Optional.of(storedToken));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> authService.refresh(new RefreshTokenRequest("refresh-expired"))
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(401);
        assertThat(storedToken.getRevoked()).isTrue();
    }

    @Test
    void revokedRefreshTokenThrowsUnauthorized() {
        when(refreshTokenRepository.findByTokenAndRevokedFalse("refresh-revoked")).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> authService.refresh(new RefreshTokenRequest("refresh-revoked"))
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void requestPasswordResetPersistsTokenWithFifteenMinuteExpiryAndSendsEmail() {
        User user = User.builder()
            .id(50L)
            .email("buyer@example.com")
            .role(Role.BUYER)
            .status(Status.ACTIVE)
            .build();
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.requestPasswordReset("buyer@example.com");

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(tokenCaptor.capture());
        PasswordResetToken savedToken = tokenCaptor.getValue();

        assertThat(savedToken.getUser()).isEqualTo(user);
        assertThat(savedToken.getToken()).isNotBlank();
        assertThat(savedToken.getCreatedAt()).isEqualTo(NOW);
        assertThat(savedToken.getExpiresAt()).isEqualTo(NOW.plusSeconds(15 * 60));
        assertThat(savedToken.getUsed()).isFalse();
        verify(passwordResetTokenRepository).deleteByUser(user);
        verify(passwordResetEmailSender).sendPasswordResetEmail(user, savedToken.getToken());
    }

    @Test
    void requestPasswordResetDeletesExistingTokensBeforeSavingNewOne() {
        User user = User.builder()
            .id(52L)
            .email("buyer@example.com")
            .role(Role.BUYER)
            .status(Status.ACTIVE)
            .build();
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.requestPasswordReset("buyer@example.com");

        verify(passwordResetTokenRepository).deleteByUser(user);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
    }

    @Test
    void requestPasswordResetForUnknownEmailDoesNothing() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        authService.requestPasswordReset("unknown@example.com");

        verify(passwordResetTokenRepository, never()).save(any());
        verify(passwordResetEmailSender, never()).sendPasswordResetEmail(any(), any());
    }

    @Test
    void validPasswordResetTokenShouldPassValidation() {
        PasswordResetToken token = new PasswordResetToken();
        token.setToken("reset-valid");
        token.setUsed(false);
        token.setExpiresAt(NOW.plusSeconds(60));

        when(passwordResetTokenRepository.findByTokenAndUsedFalse("reset-valid")).thenReturn(Optional.of(token));

        authService.validatePasswordResetToken("reset-valid");

        verify(passwordResetTokenRepository).findByTokenAndUsedFalse("reset-valid");
    }

    @Test
    void resetPasswordUpdatesPasswordAndMarksTokenAsUsed() {
        User user = User.builder()
            .id(51L)
            .email("buyer@example.com")
            .passwordHash("old-hash")
            .role(Role.BUYER)
            .status(Status.ACTIVE)
            .build();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setToken("reset-token");
        token.setUsed(false);
        token.setExpiresAt(NOW.plusSeconds(60));
        when(passwordResetTokenRepository.findByTokenAndUsedFalse("reset-token")).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("NewSecret123!")).thenReturn("$2a$10$newHash");

        authService.resetPassword("reset-token", "NewSecret123!");

        assertThat(user.getPasswordHash()).isEqualTo("$2a$10$newHash");
        assertThat(token.getUsed()).isTrue();
    }

    @Test
    void resetPasswordWithShortPasswordThrowsBadRequest() {
        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> authService.resetPassword("reset-token", "short")
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(400);
        assertThat(exception.getReason()).isEqualTo("Password must be at least 8 characters long");
    }

    @Test
    void expiredPasswordResetTokenThrowsBadRequest() {
        PasswordResetToken token = new PasswordResetToken();
        token.setToken("reset-expired");
        token.setUsed(false);
        token.setExpiresAt(NOW.minusSeconds(1));
        when(passwordResetTokenRepository.findByTokenAndUsedFalse("reset-expired")).thenReturn(Optional.of(token));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> authService.validatePasswordResetToken("reset-expired")
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void alreadyUsedPasswordResetTokenThrowsBadRequest() {
        when(passwordResetTokenRepository.findByTokenAndUsedFalse("reset-used")).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> authService.validatePasswordResetToken("reset-used")
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(400);
    }
}
