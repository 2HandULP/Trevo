package pt.trevo.trevo_api.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pt.trevo.trevo_api.persistence.entity.Variant;

import java.util.List;

@Repository
public interface VariantRepository extends JpaRepository<Variant, Long> {

    List<Variant> findByProductId(Long productId);
}