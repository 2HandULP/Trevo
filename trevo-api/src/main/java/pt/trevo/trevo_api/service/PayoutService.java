package pt.trevo.trevo_api.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import pt.trevo.trevo_api.persistence.entity.Order;
import pt.trevo.trevo_api.persistence.entity.Payout;
import pt.trevo.trevo_api.persistence.entity.PayoutStatus;
import pt.trevo.trevo_api.persistence.repository.PayoutRepository;

@Service
public class PayoutService {

    private final PayoutRepository payoutRepository;

    public PayoutService(PayoutRepository payoutRepository) {
        this.payoutRepository = payoutRepository;
    }

    public Payout createPayout(Order order) {
        BigDecimal payoutAmount = order.getTotalAmount().subtract(order.getCommissionAmount());
        Payout payout = new Payout();
        payout.setOrder(order);
        payout.setStatus(PayoutStatus.PENDING);
        payout.setPayoutAmount(payoutAmount);
        payout.setCreatedAt(Instant.now());
        return payoutRepository.save(payout);
    }

    public BigDecimal getPendingBalance(Long shopId) {
        BigDecimal sum = payoutRepository.sumByOrderShopIdAndStatus(shopId, PayoutStatus.PENDING);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    public List<Payout> getPayoutHistory(Long shopId) {
        return payoutRepository.findByOrderShopIdAndStatusOrderByReleasedAtDesc(shopId, PayoutStatus.RELEASED);
    }
}
