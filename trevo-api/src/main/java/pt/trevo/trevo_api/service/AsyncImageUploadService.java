package pt.trevo.trevo_api.service;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import pt.trevo.trevo_api.dto.AsyncImageUploadAcceptedResponse;
import pt.trevo.trevo_api.dto.AsyncImageUploadStatusResponse;
import pt.trevo.trevo_api.dto.CloudinaryUploadResult;

@Service
public class AsyncImageUploadService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AsyncImageUploadService.class);

    private final CloudinaryService cloudinaryService;
    private final Executor imageUploadExecutor;
    private final ConcurrentMap<String, UploadJob> jobs = new ConcurrentHashMap<>();

    public AsyncImageUploadService(
        CloudinaryService cloudinaryService,
        @Qualifier("imageUploadExecutor") Executor imageUploadExecutor
    ) {
        this.cloudinaryService = cloudinaryService;
        this.imageUploadExecutor = imageUploadExecutor;
    }

    public AsyncImageUploadAcceptedResponse startUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read image file", ex);
        }

        String uploadId = UUID.randomUUID().toString();
        UploadJob job = UploadJob.pending(uploadId);
        jobs.put(uploadId, job);

        CompletableFuture.runAsync(
            () -> processUpload(job, bytes, file.getOriginalFilename(), file.getContentType()),
            imageUploadExecutor
        );

        return new AsyncImageUploadAcceptedResponse(
            uploadId,
            AsyncImageUploadStatus.PENDING,
            "/uploads/images/" + uploadId
        );
    }

    public AsyncImageUploadStatusResponse getStatus(String uploadId) {
        return Optional.ofNullable(jobs.get(uploadId))
            .map(UploadJob::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Upload job not found"));
    }

    private void processUpload(UploadJob job, byte[] bytes, String originalFilename, String contentType) {
        job.markProcessing();

        try {
            CloudinaryUploadResult result = cloudinaryService.uploadImage(bytes, originalFilename, contentType);
            job.markCompleted(result);
        } catch (ResponseStatusException ex) {
            LOGGER.warn("Async image upload {} failed: {}", job.uploadId, ex.getReason());
            job.markFailed(ex.getReason());
        } catch (RuntimeException ex) {
            LOGGER.error("Async image upload {} failed unexpectedly", job.uploadId, ex);
            job.markFailed("Failed to upload image");
        }
    }

    private static final class UploadJob {
        private final String uploadId;
        private final Instant createdAt;
        private volatile AsyncImageUploadStatus status;
        private volatile CloudinaryUploadResult result;
        private volatile String error;
        private volatile Instant completedAt;

        private UploadJob(String uploadId, Instant createdAt) {
            this.uploadId = uploadId;
            this.createdAt = createdAt;
            this.status = AsyncImageUploadStatus.PENDING;
        }

        private static UploadJob pending(String uploadId) {
            return new UploadJob(uploadId, Instant.now());
        }

        private void markProcessing() {
            this.status = AsyncImageUploadStatus.PROCESSING;
        }

        private void markCompleted(CloudinaryUploadResult result) {
            this.result = result;
            this.status = AsyncImageUploadStatus.COMPLETED;
            this.completedAt = Instant.now();
        }

        private void markFailed(String error) {
            this.error = error;
            this.status = AsyncImageUploadStatus.FAILED;
            this.completedAt = Instant.now();
        }

        private AsyncImageUploadStatusResponse toResponse() {
            return new AsyncImageUploadStatusResponse(uploadId, status, result, error, createdAt, completedAt);
        }
    }
}
