package com.ecommerce.backend.order;

import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.backend.order.dto.CheckoutRequest;
import com.ecommerce.backend.order.dto.OrderResponse;
import com.ecommerce.backend.security.SecurityUtils;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/checkout")
    public OrderResponse checkout(@Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(SecurityUtils.currentUser().id(), request);
    }

    @GetMapping("/me")
    public List<OrderResponse> listMyOrders() {
        return orderService.listForCurrentUser(SecurityUtils.currentUser().id());
    }
}
