package com.ecommerce.backend.banner.dto;

import com.ecommerce.backend.banner.Banner;

public record BannerResponse(
        Long id,
        String title,
        String imageUrl,
        int sortOrder,
        boolean active) {

    public static BannerResponse from(Banner banner) {
        return new BannerResponse(
                banner.getId(),
                banner.getTitle(),
                banner.getImageUrl(),
                banner.getSortOrder(),
                banner.isActive());
    }
}
