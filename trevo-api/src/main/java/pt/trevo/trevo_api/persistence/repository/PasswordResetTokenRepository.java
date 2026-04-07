package pt.trevo.trevo_api.persistence.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import pt.trevo.trevo_api.persistence.entity.PasswordResetToken;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenAndUsedFalse(String token);
}
