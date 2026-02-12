package com.ecommerce.backend.auth.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Long userId,
        String fullName,
        String email,
        String role) {
}
