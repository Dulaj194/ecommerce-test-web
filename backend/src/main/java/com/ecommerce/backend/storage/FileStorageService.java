package com.ecommerce.backend.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.backend.common.BadRequestException;

import jakarta.annotation.PostConstruct;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class FileStorageService implements StorageService {

    private final Path rootPath;
    private Path bannersPath;
    private Path productsPath;

    public FileStorageService(@Value("${app.storage.upload-dir}") String uploadDir) {
        this.rootPath = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() throws IOException {
        this.bannersPath = rootPath.resolve("banners");
        this.productsPath = rootPath.resolve("products");
        Files.createDirectories(bannersPath);
        Files.createDirectories(productsPath);
    }

    @Override
    public String storeBanner(MultipartFile file) {
        return storeImage(file, bannersPath, "/uploads/banners/");
    }

    @Override
    public String storeProductImage(MultipartFile file) {
        return storeImage(file, productsPath, "/uploads/products/");
    }

    private String storeImage(MultipartFile file, Path directory, String publicPrefix) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required.");
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
        Path destination = directory.resolve(fileName).normalize();
        if (!destination.startsWith(directory)) {
            throw new BadRequestException("Invalid file path.");
        }

        try {
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BadRequestException("Unable to store image.");
        }

        return publicPrefix + fileName;
    }

    @Override
    public void deleteByPublicPath(String publicPath) {
        if (publicPath == null || publicPath.isBlank() || !publicPath.startsWith("/uploads/")) {
            return;
        }

        Path basePath;
        String fileName;
        if (publicPath.startsWith("/uploads/banners/")) {
            basePath = bannersPath;
            fileName = publicPath.replace("/uploads/banners/", "");
        } else if (publicPath.startsWith("/uploads/products/")) {
            basePath = productsPath;
            fileName = publicPath.replace("/uploads/products/", "");
        } else {
            return;
        }

        Path filePath = basePath.resolve(fileName).normalize();
        if (!filePath.startsWith(basePath)) {
            return;
        }

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
            // Non-blocking cleanup.
        }
    }
}
