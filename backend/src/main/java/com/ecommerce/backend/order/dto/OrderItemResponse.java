package com.ecommerce.backend.order.dto;

import java.math.BigDecimal;

import com.ecommerce.backend.order.OrderItem;

public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        String imageUrl,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProductName(),
                item.getProduct().getImageUrl(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal());
    }
}
