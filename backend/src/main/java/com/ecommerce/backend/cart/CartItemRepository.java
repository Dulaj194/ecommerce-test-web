package com.ecommerce.backend.cart;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ecommerce.backend.product.Product;
import com.ecommerce.backend.user.User;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByUserIdOrderByIdDesc(Long userId);
    Optional<CartItem> findByIdAndUserId(Long id, Long userId);
    Optional<CartItem> findByUserAndProduct(User user, Product product);
    void deleteByUserId(Long userId);
}
