package com.ecommerce.backend.order;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ecommerce.backend.cart.CartItem;
import com.ecommerce.backend.cart.CartService;
import com.ecommerce.backend.common.BadRequestException;
import com.ecommerce.backend.common.NotFoundException;
import com.ecommerce.backend.order.dto.CheckoutRequest;
import com.ecommerce.backend.order.dto.OrderResponse;
import com.ecommerce.backend.product.Product;
import com.ecommerce.backend.product.ProductRepository;
import com.ecommerce.backend.user.User;
import com.ecommerce.backend.user.UserRepository;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartService cartService;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public OrderService(
            OrderRepository orderRepository,
            CartService cartService,
            ProductRepository productRepository,
            UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.cartService = cartService;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public OrderResponse checkout(Long userId, CheckoutRequest request) {
        if (request.shippingAddress() == null || request.shippingAddress().isBlank()) {
            throw new BadRequestException("Shipping address is required.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found."));
        List<CartItem> cartItems = cartService.getRawItems(userId);
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Cart is empty.");
        }

        validateStock(cartItems);

        Order order = new Order();
        order.setUser(user);
        order.setStatus(OrderStatus.PENDING);
        order.setShippingAddress(request.shippingAddress().trim());

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            int quantity = cartItem.getQuantity();
            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(quantity));

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setProductName(product.getName());
            orderItem.setQuantity(quantity);
            orderItem.setUnitPrice(product.getPrice());
            orderItem.setLineTotal(lineTotal);
            orderItems.add(orderItem);

            product.setStock(product.getStock() - quantity);
            productRepository.save(product);

            totalAmount = totalAmount.add(lineTotal);
        }

        order.setTotalAmount(totalAmount);
        order.getItems().addAll(orderItems);

        Order saved = orderRepository.save(order);
        cartService.clearCart(userId);
        return OrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listForCurrentUser(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listAll() {
        return orderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, String statusValue) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found."));
        OrderStatus status = parseStatus(statusValue);
        order.setStatus(status);
        return OrderResponse.from(orderRepository.save(order));
    }

    private void validateStock(List<CartItem> cartItems) {
        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            if (!product.isActive()) {
                throw new BadRequestException("One of the products is no longer available.");
            }
            if (cartItem.getQuantity() > product.getStock()) {
                throw new BadRequestException("Insufficient stock for product: " + product.getName());
            }
        }
    }

    private OrderStatus parseStatus(String value) {
        try {
            return OrderStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Invalid order status.");
        }
    }
}
