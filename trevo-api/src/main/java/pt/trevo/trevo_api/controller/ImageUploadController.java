package pt.trevo.trevo_api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pt.trevo.trevo_api.dto.CloudinaryUploadResult;
import pt.trevo.trevo_api.service.CloudinaryService;

@RestController
@RequestMapping("/api/uploads")
public class ImageUploadController {

    private final CloudinaryService cloudinaryService;
    private final ImageUploadValidator imageUploadValidator;

    public ImageUploadController(CloudinaryService cloudinaryService, ImageUploadValidator imageUploadValidator) {
        this.cloudinaryService = cloudinaryService;
        this.imageUploadValidator = imageUploadValidator;
    }

    @PostMapping("/images")
    @PreAuthorize("isAuthenticated()")
    @ResponseStatus(HttpStatus.CREATED)
    public CloudinaryUploadResult uploadImage(@RequestParam MultipartFile file) {
        imageUploadValidator.validateOptionalImage(file, "file");
        return cloudinaryService.uploadImage(file);
    }
}
