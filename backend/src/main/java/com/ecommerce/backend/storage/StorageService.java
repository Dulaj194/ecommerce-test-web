package com.ecommerce.backend.storage;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {

    String storeBanner(MultipartFile file);

    void deleteByPublicPath(String publicPath);
}
