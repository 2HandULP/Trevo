package pt.trevo.trevo_api.service;

import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.persistence.entity.OrderStatus;
import pt.trevo.trevo_api.persistence.entity.Review;
import pt.trevo.trevo_api.persistence.entity.Shop;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.repository.OrderRepository;
import pt.trevo.trevo_api.persistence.repository.ReviewRepository;
import pt.trevo.trevo_api.persistence.repository.ShopRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;

    public ReviewService(
        ReviewRepository reviewRepository,
        OrderRepository orderRepository,
        UserRepository userRepository,
        ShopRepository shopRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
    }

    @Transactional
    public Review createReview(Long buyerId, Long shopId, Integer rating, String comment) {
        if (buyerId == null || shopId == null || rating == null || rating < 1 || rating > 5) {
            throw badRequest("Invalid review request");
        }

        if (!orderRepository.existsByBuyerIdAndShopIdAndStatus(buyerId, shopId, OrderStatus.DELIVERED)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Buyer has no delivered order from this shop");
        }

        if (reviewRepository.existsByBuyerIdAndShopId(buyerId, shopId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Review already exists for this buyer and shop");
        }

        User buyer = userRepository.findById(buyerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Buyer not found"));
        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        Review review = new Review();
        review.setBuyer(buyer);
        review.setShop(shop);
        review.setRating(rating);
        review.setComment(comment);
        review.setCreatedAt(Instant.now());

        return reviewRepository.save(review);
    }

    @Transactional
    public Review updateReview(Long reviewId, Long requesterId, Integer rating, String comment) {
        if (reviewId == null || requesterId == null || rating == null || rating < 1 || rating > 5) {
            throw badRequest("Invalid update review request");
        }

        Review review = findReview(reviewId);

        if (!review.getBuyer().getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the review author can update this review");
        }

        review.setRating(rating);
        review.setComment(comment);
        return reviewRepository.save(review);
    }

    @Transactional
    public void deleteReview(Long reviewId, Long requesterId) {
        if (reviewId == null || requesterId == null) {
            throw badRequest("Invalid delete review request");
        }

        Review review = findReview(reviewId);

        if (!review.getBuyer().getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the review author can delete this review");
        }

        reviewRepository.delete(review);
    }

    @Transactional
    public Review respondToReview(Long reviewId, Long requesterId, String response) {
        if (reviewId == null || requesterId == null || response == null || response.isBlank()) {
            throw badRequest("Invalid respond to review request");
        }

        Review review = findReview(reviewId);

        if (!review.getShop().getOwner().getId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the shop owner can respond to this review");
        }

        if (review.getResponse() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Review already has a response");
        }

        review.setResponse(response);
        return reviewRepository.save(review);
    }

    private Review findReview(Long reviewId) {
        return reviewRepository.findById(reviewId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
    }

    private ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
