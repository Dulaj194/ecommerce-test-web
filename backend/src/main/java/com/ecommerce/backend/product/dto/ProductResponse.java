package com.ecommerce.backend.product.dto;

import java.math.BigDecimal;
import java.util.List;

import com.ecommerce.backend.product.Product;

public record ProductResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        int stock,
        String imageUrl,
        List<String> imageUrls,
        boolean active) {

    public static ProductResponse from(Product product) {
        List<String> imageUrls = product.getImages().stream()
                .map(image -> image.getImageUrl())
                .toList();
        if (imageUrls.isEmpty() && product.getImageUrl() != null && !product.getImageUrl().isBlank()) {
            imageUrls = List.of(product.getImageUrl());
        }

        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getStock(),
                product.getImageUrl(),
                imageUrls,
                product.isActive());
    }
}
