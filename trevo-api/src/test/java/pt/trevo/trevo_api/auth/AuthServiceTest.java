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
import pt.trevo.trevo_api.persistence.entity.RefreshToken;
import pt.trevo.trevo_api.persistence.entity.Role;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.ShopStatus;
import pt.trevo.trevo_api.persistence.entity.Status;
import pt.trevo.trevo_api.persistence.entity.User;
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
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
            userRepository,
            shopRepository,
            refreshTokenRepository,
            passwordEncoder,
            jwtService,
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
    void missingRequiredFieldsThrowBadRequest() {
        RegisterBuyerRequest request = new RegisterBuyerRequest("", "", "", null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.registerBuyer(request));

        assertThat(exception.getStatusCode().value()).isEqualTo(400);
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
}
