package pt.trevo.trevo_api.service;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.dto.CloudinaryUploadResult;
import pt.trevo.trevo_api.dto.UserPhotoResponse;
import pt.trevo.trevo_api.dto.UserPhotosResponse;
import pt.trevo.trevo_api.persistence.entity.User;
import pt.trevo.trevo_api.persistence.entity.UserPhoto;
import pt.trevo.trevo_api.persistence.repository.UserPhotoRepository;
import pt.trevo.trevo_api.persistence.repository.UserRepository;

@Service
public class UserPhotoService {

    private static final int REQUIRED_PHOTO_COUNT = 3;

    private final CloudinaryService cloudinaryService;
    private final UserRepository userRepository;
    private final UserPhotoRepository userPhotoRepository;

    public UserPhotoService(
        CloudinaryService cloudinaryService,
        UserRepository userRepository,
        UserPhotoRepository userPhotoRepository
    ) {
        this.cloudinaryService = cloudinaryService;
        this.userRepository = userRepository;
        this.userPhotoRepository = userPhotoRepository;
    }

    @Transactional
    public UserPhotosResponse uploadPhotos(Long buyerId, List<MultipartFile> photos) {
        if (buyerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Buyer id is required");
        }
        if (photos == null || photos.size() != REQUIRED_PHOTO_COUNT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exactly 3 photos are required");
        }

        User buyer = userRepository.findById(buyerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Buyer not found"));

        List<CloudinaryUploadResult> uploadedPhotos = photos.stream()
            .map(cloudinaryService::uploadImage)
            .toList();

        userPhotoRepository.deleteByBuyerId(buyerId);

        Instant uploadedAt = Instant.now();
        List<UserPhoto> savedPhotos = userPhotoRepository.saveAll(uploadedPhotos.stream()
            .map(uploadedPhoto -> toEntity(buyer, uploadedPhoto.url(), uploadedAt))
            .toList());

        return new UserPhotosResponse(savedPhotos.stream()
            .map(this::toResponse)
            .toList());
    }

    private UserPhoto toEntity(User buyer, String photoUrl, Instant uploadedAt) {
        UserPhoto userPhoto = new UserPhoto();
        userPhoto.setBuyer(buyer);
        userPhoto.setPhotoUrl(photoUrl);
        userPhoto.setUploadedAt(uploadedAt);
        return userPhoto;
    }

    private UserPhotoResponse toResponse(UserPhoto userPhoto) {
        return new UserPhotoResponse(userPhoto.getId(), userPhoto.getPhotoUrl(), userPhoto.getUploadedAt());
    }
}
