package com.ecommerce.backend.security;

import java.io.IOException;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RedisRateLimitFilter extends OncePerRequestFilter {

    private final StringRedisTemplate redisTemplate;

    @Value("${app.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limit.window-seconds:60}")
    private int windowSeconds;

    @Value("${app.rate-limit.auth.max-requests:20}")
    private int authMaxRequests;

    @Value("${app.rate-limit.cart.max-requests:180}")
    private int cartMaxRequests;

    @Value("${app.rate-limit.checkout.max-requests:30}")
    private int checkoutMaxRequests;

    public RedisRateLimitFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return HttpMethod.OPTIONS.matches(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        RateRule rule = resolveRule(request.getRequestURI());
        if (rule == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String identity = resolveIdentity(request);
            long currentWindow = System.currentTimeMillis() / 1000 / windowSeconds;
            String key = "rate-limit:" + rule.key() + ":" + identity + ":" + currentWindow;

            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, Duration.ofSeconds(windowSeconds));
            }

            if (count != null && count > rule.maxRequests()) {
                response.setStatus(429);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"error\":\"Too many requests. Please retry shortly.\"}");
                return;
            }
        } catch (Exception ignored) {
            // Fail-open for availability. API calls continue if Redis is transiently unavailable.
        }

        filterChain.doFilter(request, response);
    }

    private RateRule resolveRule(String path) {
        if (path == null) {
            return null;
        }
        if (path.equals("/api/auth/login") || path.equals("/api/auth/admin/login") || path.equals("/api/auth/register")) {
            return new RateRule("auth", authMaxRequests);
        }
        if (path.startsWith("/api/cart")) {
            return new RateRule("cart", cartMaxRequests);
        }
        if (path.equals("/api/orders/checkout")) {
            return new RateRule("checkout", checkoutMaxRequests);
        }
        return null;
    }

    private String resolveIdentity(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            int comma = forwarded.indexOf(',');
            return comma > -1 ? forwarded.substring(0, comma).trim() : forwarded.trim();
        }
        return request.getRemoteAddr();
    }

    private record RateRule(String key, int maxRequests) {
    }
}
