package pt.trevo.trevo_api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pt.trevo.trevo_api.dto.AsyncImageUploadAcceptedResponse;
import pt.trevo.trevo_api.dto.AsyncImageUploadStatusResponse;
import pt.trevo.trevo_api.service.AsyncImageUploadService;

@RestController
@RequestMapping("/api/uploads")
public class ImageUploadController {

    private final AsyncImageUploadService asyncImageUploadService;
    private final ImageUploadValidator imageUploadValidator;

    public ImageUploadController(
        AsyncImageUploadService asyncImageUploadService,
        ImageUploadValidator imageUploadValidator
    ) {
        this.asyncImageUploadService = asyncImageUploadService;
        this.imageUploadValidator = imageUploadValidator;
    }

    @PostMapping("/images")
    @PreAuthorize("isAuthenticated()")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AsyncImageUploadAcceptedResponse uploadImage(@RequestParam MultipartFile file) {
        imageUploadValidator.validateOptionalImage(file, "file");
        return asyncImageUploadService.startUpload(file);
    }

    @GetMapping("/images/{uploadId}")
    @PreAuthorize("isAuthenticated()")
    public AsyncImageUploadStatusResponse getUploadStatus(@PathVariable String uploadId) {
        return asyncImageUploadService.getStatus(uploadId);
    }
}
