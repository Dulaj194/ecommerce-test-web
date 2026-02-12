package com.ecommerce.backend.config;

import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

@Configuration
public class RedisCacheConfig {

    @Bean
    public RedisCacheConfiguration redisCacheConfiguration(
            @Value("${app.cache.ttl-seconds:120}") long defaultTtlSeconds) {
        return buildConfig(defaultTtlSeconds);
    }

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer(
            @Value("${app.cache.products-ttl-seconds:60}") long productsTtlSeconds,
            @Value("${app.cache.banners-ttl-seconds:30}") long bannersTtlSeconds) {
        return builder -> builder.withInitialCacheConfigurations(Map.of(
                "public-products", buildConfig(productsTtlSeconds),
                "public-product-by-id", buildConfig(productsTtlSeconds),
                "public-banners", buildConfig(bannersTtlSeconds)));
    }

    private RedisCacheConfiguration buildConfig(long ttlSeconds) {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofSeconds(ttlSeconds))
                .disableCachingNullValues()
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}
