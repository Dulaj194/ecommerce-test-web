package com.ecommerce.backend.product;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ecommerce.backend.common.NotFoundException;
import com.ecommerce.backend.common.dto.PagedResponse;
import com.ecommerce.backend.product.dto.ProductResponse;
import com.ecommerce.backend.product.dto.UpsertProductRequest;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> listPublic(String search, int page, int size) {
        Page<Product> products = productRepository.searchActive(
                normalizeSearch(search),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return toPagedResponse(products);
    }

    @Transactional(readOnly = true)
    public ProductResponse getPublicProduct(Long id) {
        Product product = productRepository.findById(id)
                .filter(Product::isActive)
                .orElseThrow(() -> new NotFoundException("Product not found."));
        return ProductResponse.from(product);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> listAdmin(String search, int page, int size) {
        Page<Product> products = productRepository.searchAll(
                normalizeSearch(search),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return toPagedResponse(products);
    }

    @Transactional(readOnly = true)
    public ProductResponse getAdminProduct(Long id) {
        return ProductResponse.from(findProduct(id));
    }

    @Transactional
    public ProductResponse createProduct(UpsertProductRequest request) {
        Product product = new Product();
        apply(product, request);
        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, UpsertProductRequest request) {
        Product product = findProduct(id);
        apply(product, request);
        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = findProduct(id);
        product.setActive(false);
        productRepository.save(product);
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found."));
    }

    private void apply(Product product, UpsertProductRequest request) {
        product.setName(request.name().trim());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStock(request.stock());
        product.setImageUrl(request.imageUrl());
        product.setActive(request.active());
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        return search.trim();
    }

    private PagedResponse<ProductResponse> toPagedResponse(Page<Product> page) {
        Page<ProductResponse> mapped = page.map(ProductResponse::from);
        return new PagedResponse<>(
                mapped.getContent(),
                mapped.getNumber(),
                mapped.getSize(),
                mapped.getTotalElements(),
                mapped.getTotalPages());
    }
}
