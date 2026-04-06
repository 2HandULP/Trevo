package pt.trevo.trevo_api.persistence.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findAllByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    List<Order> findAllByShopIdOrderByCreatedAtDesc(Long shopId);

    List<Order> findAllByShopIdAndStatusOrderByCreatedAtDesc(Long shopId, OrderStatus status);
}
