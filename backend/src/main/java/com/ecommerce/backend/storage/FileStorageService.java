package com.ecommerce.backend.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.backend.common.BadRequestException;

import jakarta.annotation.PostConstruct;

@Service
public class FileStorageService {

    private final Path rootPath;
    private Path bannersPath;

    public FileStorageService(@Value("${app.storage.upload-dir}") String uploadDir) {
        this.rootPath = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() throws IOException {
        this.bannersPath = rootPath.resolve("banners");
        Files.createDirectories(bannersPath);
    }

    public String storeBanner(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Banner image file is required.");
        }
        if (!Objects.requireNonNullElse(file.getContentType(), "").startsWith("image/")) {
            throw new BadRequestException("Only image files are allowed.");
        }

        String original = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "banner"));
        String extension = "";
        int dot = original.lastIndexOf('.');
        if (dot > -1) {
            extension = original.substring(dot);
        }

        String fileName = UUID.randomUUID() + extension;
        Path destination = bannersPath.resolve(fileName).normalize();
        if (!destination.startsWith(bannersPath)) {
            throw new BadRequestException("Invalid file path.");
        }

        try {
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BadRequestException("Unable to store banner image.");
        }

        return "/uploads/banners/" + fileName;
    }

    public void deleteByPublicPath(String publicPath) {
        if (publicPath == null || publicPath.isBlank() || !publicPath.startsWith("/uploads/banners/")) {
            return;
        }

        String fileName = publicPath.replace("/uploads/banners/", "");
        Path filePath = bannersPath.resolve(fileName).normalize();
        if (!filePath.startsWith(bannersPath)) {
            return;
        }

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
            // Non-blocking cleanup.
        }
    }
}
