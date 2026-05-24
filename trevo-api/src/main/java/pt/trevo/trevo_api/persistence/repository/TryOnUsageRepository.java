package pt.trevo.trevo_api.persistence.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pt.trevo.trevo_api.persistence.entity.TryOnUsage;

public interface TryOnUsageRepository extends JpaRepository<TryOnUsage, Long> {

    Optional<TryOnUsage> findByBuyerIdAndProductId(Long buyerId, Long productId);
}
