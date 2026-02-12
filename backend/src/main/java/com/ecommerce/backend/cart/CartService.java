package com.ecommerce.backend.cart;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ecommerce.backend.cart.dto.AddCartItemRequest;
import com.ecommerce.backend.cart.dto.CartItemResponse;
import com.ecommerce.backend.cart.dto.CartResponse;
import com.ecommerce.backend.cart.dto.UpdateCartItemRequest;
import com.ecommerce.backend.common.BadRequestException;
import com.ecommerce.backend.common.NotFoundException;
import com.ecommerce.backend.product.Product;
import com.ecommerce.backend.product.ProductRepository;
import com.ecommerce.backend.user.User;
import com.ecommerce.backend.user.UserRepository;

@Service
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartService(
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository) {
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        List<CartItemResponse> items = cartItemRepository.findByUserIdOrderByIdDesc(userId)
                .stream()
                .map(CartItemResponse::from)
                .toList();
        return mapCartResponse(items);
    }

    @Transactional
    public CartResponse addItem(Long userId, AddCartItemRequest request) {
        User user = getUser(userId);
        Product product = getProduct(request.productId());
        validateStock(product, request.quantity());

        CartItem item = cartItemRepository.findByUserAndProduct(user, product)
                .orElseGet(() -> {
                    CartItem newItem = new CartItem();
                    newItem.setUser(user);
                    newItem.setProduct(product);
                    newItem.setQuantity(0);
                    return newItem;
                });

        int requestedQuantity = item.getQuantity() + request.quantity();
        validateStock(product, requestedQuantity);
        item.setQuantity(requestedQuantity);
        cartItemRepository.save(item);

        return getCart(userId);
    }

    @Transactional
    public CartResponse updateItem(Long userId, Long cartItemId, UpdateCartItemRequest request) {
        CartItem item = cartItemRepository.findByIdAndUserId(cartItemId, userId)
                .orElseThrow(() -> new NotFoundException("Cart item not found."));
        validateStock(item.getProduct(), request.quantity());
        item.setQuantity(request.quantity());
        cartItemRepository.save(item);
        return getCart(userId);
    }

    @Transactional
    public CartResponse removeItem(Long userId, Long cartItemId) {
        CartItem item = cartItemRepository.findByIdAndUserId(cartItemId, userId)
                .orElseThrow(() -> new NotFoundException("Cart item not found."));
        cartItemRepository.delete(item);
        return getCart(userId);
    }

    @Transactional
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<CartItem> getRawItems(Long userId) {
        return cartItemRepository.findByUserIdOrderByIdDesc(userId);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found."));
    }

    private Product getProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found."));
        if (!product.isActive()) {
            throw new BadRequestException("Product is not available.");
        }
        return product;
    }

    private void validateStock(Product product, int quantity) {
        if (quantity > product.getStock()) {
            throw new BadRequestException("Requested quantity is higher than available stock.");
        }
    }

    private CartResponse mapCartResponse(List<CartItemResponse> items) {
        BigDecimal subtotal = items.stream()
                .map(CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int totalItems = items.stream()
                .mapToInt(CartItemResponse::quantity)
                .sum();
        return new CartResponse(items, totalItems, subtotal);
    }
}
