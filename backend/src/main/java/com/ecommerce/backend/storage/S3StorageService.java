package com.ecommerce.backend.storage;

import java.net.URI;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.backend.common.BadRequestException;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "s3")
public class S3StorageService implements StorageService {

    private final S3Client s3Client;
    private final String bucket;
    private final String region;
    private final String publicBaseUrl;
    private final String keyPrefix;

    public S3StorageService(
            S3Client s3Client,
            @Value("${app.storage.s3.bucket}") String bucket,
            @Value("${app.storage.s3.region}") String region,
            @Value("${app.storage.s3.public-base-url:}") String publicBaseUrl,
            @Value("${app.storage.s3.key-prefix:ecommerce}") String keyPrefix) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.region = region;
        this.publicBaseUrl = publicBaseUrl;
        this.keyPrefix = keyPrefix;
    }

    @Override
    public String storeBanner(MultipartFile file) {
        return storeImage(file, "banners");
    }

    @Override
    public String storeProductImage(MultipartFile file) {
        return storeImage(file, "products");
    }

    private String storeImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is required.");
        }
        if (!Objects.requireNonNullElse(file.getContentType(), "").startsWith("image/")) {
            throw new BadRequestException("Only image files are allowed.");
        }

        String fileName = Objects.requireNonNullElse(file.getOriginalFilename(), "banner").trim();
        String extension = "";
        int dot = fileName.lastIndexOf('.');
        if (dot > -1) {
            extension = fileName.substring(dot).toLowerCase(Locale.ROOT);
        }

        String key = normalizedPrefix() + folder + "/" + UUID.randomUUID() + extension;
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (Exception ex) {
            throw new BadRequestException("Unable to store image.");
        }

        return buildPublicUrl(key);
    }

    @Override
    public void deleteByPublicPath(String publicPath) {
        String key = extractKey(publicPath);
        if (!StringUtils.hasText(key)) {
            return;
        }

        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build());
        } catch (Exception ignored) {
            // Non-blocking cleanup.
        }
    }

    private String buildPublicUrl(String key) {
        if (StringUtils.hasText(publicBaseUrl)) {
            return trimTrailingSlash(publicBaseUrl) + "/" + key;
        }
        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
    }

    private String extractKey(String publicPath) {
        if (!StringUtils.hasText(publicPath) || publicPath.startsWith("/uploads/")) {
            return null;
        }

        if (publicPath.startsWith("http://") || publicPath.startsWith("https://")) {
            try {
                URI uri = URI.create(publicPath);
                String path = Objects.requireNonNullElse(uri.getPath(), "");
                if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                if (path.startsWith(bucket + "/")) {
                    path = path.substring(bucket.length() + 1);
                }
                return path;
            } catch (Exception ex) {
                return null;
            }
        }

        return publicPath;
    }

    private String normalizedPrefix() {
        String trimmed = Objects.requireNonNullElse(keyPrefix, "").trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        return trimTrailingSlash(trimmed) + "/";
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
