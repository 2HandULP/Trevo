package pt.trevo.trevo_api.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pt.trevo.trevo_api.persistence.entity.Shop;

import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    Optional<Shop> findByNif(String nif);

    Optional<Shop> findByOwnerId(Long ownerId);
}