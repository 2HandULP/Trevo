package pt.trevo.trevo_api.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import pt.trevo.trevo_api.dto.TryOnImageResponse;
import pt.trevo.trevo_api.dto.TryOnRequest;
import pt.trevo.trevo_api.security.SecurityUtils;
import pt.trevo.trevo_api.service.MultipartUserPhotoInput;
import pt.trevo.trevo_api.service.TryOnService;
import pt.trevo.trevo_api.service.UserPhotoInput;

@RestController
@RequestMapping("/try-on")
@PreAuthorize("hasRole('BUYER')")
public class TryOnController {

    private static final int PERSONALIZED_PHOTO_COUNT = 3;

    private final TryOnService tryOnService;
    private final ImageUploadValidator imageUploadValidator;
    private final SecurityUtils securityUtils;

    public TryOnController(
        TryOnService tryOnService,
        ImageUploadValidator imageUploadValidator,
        SecurityUtils securityUtils
    ) {
        this.tryOnService = tryOnService;
        this.imageUploadValidator = imageUploadValidator;
        this.securityUtils = securityUtils;
    }

    @PostMapping
    public TryOnImageResponse generateTryOn(
        Authentication authentication,
        @Valid @RequestBody TryOnRequest request
    ) {
        Long buyerId = securityUtils.requireUserId(authentication);
        return tryOnService.generateTryOn(buyerId, request.productId(), request.modelIdentifier());
    }

    @PostMapping(path = "/personalized", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TryOnImageResponse generatePersonalizedTryOn(
        Authentication authentication,
        @RequestParam Long productId,
        @RequestParam("photos") List<MultipartFile> photos
    ) {
        if (photos == null || photos.size() != PERSONALIZED_PHOTO_COUNT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exactly 3 photos are required");
        }
        photos.forEach(photo -> imageUploadValidator.validateOptionalImage(photo, "photos"));
        List<UserPhotoInput> photoInputs = photos.stream()
            .map(MultipartUserPhotoInput::new)
            .map(UserPhotoInput.class::cast)
            .toList();
        Long buyerId = securityUtils.requireUserId(authentication);
        return tryOnService.generatePersonalizedTryOn(buyerId, productId, photoInputs);
    }
}
