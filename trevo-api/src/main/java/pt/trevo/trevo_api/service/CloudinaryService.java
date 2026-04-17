package pt.trevo.trevo_api.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public CloudinaryUploadResult uploadImage(MultipartFile file) {
        validateImage(file);

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap("resource_type", "image")
            );

            String publicId = asString(uploadResult.get("public_id"));
            String secureUrl = asString(uploadResult.get("secure_url"));
            String fallbackUrl = asString(uploadResult.get("url"));
            String imageUrl = secureUrl != null ? secureUrl : fallbackUrl;

            if (publicId == null || imageUrl == null) {
                throw new IllegalStateException("Cloudinary response did not include image identifiers");
            }

            return new CloudinaryUploadResult(publicId, imageUrl);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to upload image to Cloudinary", ex);
        }
    }

    public void deleteImage(String publicId) {
        if (isBlank(publicId)) {
            throw new IllegalArgumentException("Image publicId is required");
        }

        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to delete image from Cloudinary", ex);
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }

        String contentType = file.getContentType();
        if (isBlank(contentType) || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
    }

    private String asString(Object value) {
        return value instanceof String text && !text.isBlank() ? text : null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}

