package pt.trevo.trevo_api.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pt.trevo.trevo_api.persistence.entity.Variant;

import java.util.Collection;
import java.util.List;

@Repository
public interface VariantRepository extends JpaRepository<Variant, Long> {

    List<Variant> findByProductId(Long productId);

    List<Variant> findByProductIdIn(Collection<Long> productIds);

    boolean existsByProductIdAndSizeIgnoreCaseAndColorIgnoreCase(Long productId, String size, String color);

    boolean existsByProductIdAndIdNotAndSizeIgnoreCaseAndColorIgnoreCase(Long productId, Long id, String size, String color);
}
