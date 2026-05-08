package pt.trevo.trevo_api.persistence.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pt.trevo.trevo_api.persistence.entity.AppNotification;

public interface NotificationRepository extends JpaRepository<AppNotification, Long> {

    long countByRecipientIdAndReadAtIsNull(Long recipientId);

    List<AppNotification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
}
