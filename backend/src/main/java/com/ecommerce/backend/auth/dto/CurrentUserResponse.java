package com.ecommerce.backend.auth.dto;

public record CurrentUserResponse(
        Long userId,
        String fullName,
        String email,
        String role) {
}
