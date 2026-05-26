package pt.trevo.trevo_api.service;

import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

public record MultipartUserPhotoInput(MultipartFile file) implements UserPhotoInput {

    @Override
    public String filename() {
        return file.getOriginalFilename();
    }

    @Override
    public String contentType() {
        return file.getContentType();
    }

    @Override
    public long size() {
        return file.getSize();
    }

    @Override
    public byte[] bytes() {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read photo upload", exception);
        }
    }
}
