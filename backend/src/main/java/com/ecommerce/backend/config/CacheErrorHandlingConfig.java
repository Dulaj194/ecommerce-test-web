package com.ecommerce.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CacheErrorHandlingConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(CacheErrorHandlingConfig.class);

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache GET failed for cache={} key={}. Continuing without cache.", cacheName(cache), key);
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Cache PUT failed for cache={} key={}. Continuing without cache.", cacheName(cache), key);
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache EVICT failed for cache={} key={}. Continuing without cache.", cacheName(cache), key);
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Cache CLEAR failed for cache={}. Continuing without cache.", cacheName(cache));
            }

            private String cacheName(Cache cache) {
                return cache == null ? "unknown" : cache.getName();
            }
        };
    }
}
