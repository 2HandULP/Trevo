package pt.trevo.trevo_api.persistence.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.trevo.trevo_api.persistence.entity.TryOnImage;

public interface TryOnImageRepository extends JpaRepository<TryOnImage, Long> {

    @Query("""
        select image
        from TryOnImage image
        join image.usage usage
        where usage.product.id = :productId
          and image.modelIdentifier = :modelIdentifier
        order by image.generatedAt desc
        """)
    List<TryOnImage> findCached(
        @Param("productId") Long productId,
        @Param("modelIdentifier") String modelIdentifier,
        Pageable pageable
    );

    default Optional<TryOnImage> findFirstCached(Long productId, String modelIdentifier) {
        return findCached(productId, modelIdentifier, PageRequest.of(0, 1)).stream().findFirst();
    }
}
