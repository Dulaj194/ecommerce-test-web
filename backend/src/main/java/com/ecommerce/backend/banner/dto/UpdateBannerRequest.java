package com.ecommerce.backend.banner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateBannerRequest(
        @NotBlank @Size(max = 200) String title,
        int sortOrder,
        boolean active) {
}
