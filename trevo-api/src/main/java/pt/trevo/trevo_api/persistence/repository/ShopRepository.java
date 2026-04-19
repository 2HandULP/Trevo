package pt.trevo.trevo_api.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import pt.trevo.trevo_api.persistence.entity.Shop;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    Optional<Shop> findByNif(String nif);

    Optional<Shop> findByOwnerId(Long ownerId);

    @Query("SELECT s FROM Shop s WHERE s.id = :id AND s.isActive = true")
    Optional<Shop> findByIdAndActive(Long id);

    @Query("SELECT s FROM Shop s WHERE s.isActive = true")
    List<Shop> findAllActive();
}