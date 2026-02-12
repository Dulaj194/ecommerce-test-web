package com.ecommerce.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.ecommerce.backend.common.BadRequestException;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static AuthUserDetails currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails userDetails)) {
            throw new BadRequestException("No authenticated user context.");
        }
        return userDetails;
    }
}
