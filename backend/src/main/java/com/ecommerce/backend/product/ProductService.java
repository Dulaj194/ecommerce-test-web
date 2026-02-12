package com.ecommerce.backend.product;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.backend.common.BadRequestException;
import com.ecommerce.backend.common.NotFoundException;
import com.ecommerce.backend.common.dto.PagedResponse;
import com.ecommerce.backend.product.dto.ProductResponse;
import com.ecommerce.backend.product.dto.UpsertProductRequest;
import com.ecommerce.backend.storage.StorageService;

@Service
public class ProductService {

    private static final int MAX_PRODUCT_IMAGES = 5;

    private final ProductRepository productRepository;
    private final StorageService storageService;

    public ProductService(ProductRepository productRepository, StorageService storageService) {
        this.productRepository = productRepository;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "public-products", key = "{#search, #page, #size}")
    public PagedResponse<ProductResponse> listPublic(String search, int page, int size) {
        Page<Product> products = productRepository.searchActive(
                normalizeSearch(search),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return toPagedResponse(products);
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "public-product-by-id", key = "#id")
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
    @CacheEvict(cacheNames = {"public-products", "public-product-by-id"}, allEntries = true)
    public ProductResponse createProduct(UpsertProductRequest request) {
        return createProduct(request, List.of());
    }

    @Transactional
    @CacheEvict(cacheNames = {"public-products", "public-product-by-id"}, allEntries = true)
    public ProductResponse createProduct(UpsertProductRequest request, List<MultipartFile> images) {
        Product product = new Product();
        applyFields(product, request);
        setProductImages(product, resolveCreateImageUrls(request, images));
        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    @CacheEvict(cacheNames = {"public-products", "public-product-by-id"}, allEntries = true)
    public ProductResponse updateProduct(Long id, UpsertProductRequest request) {
        return updateProduct(id, request, List.of());
    }

    @Transactional
    @CacheEvict(cacheNames = {"public-products", "public-product-by-id"}, allEntries = true)
    public ProductResponse updateProduct(Long id, UpsertProductRequest request, List<MultipartFile> images) {
        Product product = findProduct(id);
        applyFields(product, request);

        List<String> previousImageUrls = currentImageUrls(product);
        List<String> nextImageUrls = resolveUpdateImageUrls(product, request, images);
        setProductImages(product, nextImageUrls);

        if (!previousImageUrls.isEmpty()) {
            LinkedHashSet<String> nextSet = new LinkedHashSet<>(nextImageUrls);
            previousImageUrls.stream()
                    .filter(url -> !nextSet.contains(url))
                    .forEach(storageService::deleteByPublicPath);
        }

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    @CacheEvict(cacheNames = {"public-products", "public-product-by-id"}, allEntries = true)
    public void deleteProduct(Long id) {
        Product product = findProduct(id);
        product.setActive(false);
        productRepository.save(product);
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found."));
    }

    private void applyFields(Product product, UpsertProductRequest request) {
        product.setName(request.name().trim());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStock(request.stock());
        product.setActive(request.active());
    }

    private List<String> resolveCreateImageUrls(UpsertProductRequest request, List<MultipartFile> images) {
        List<MultipartFile> uploaded = sanitizeUploads(images);
        validateImageCount(uploaded.size());

        if (!uploaded.isEmpty()) {
            return uploaded.stream()
                    .map(storageService::storeProductImage)
                    .toList();
        }

        if (StringUtils.hasText(request.imageUrl())) {
            return List.of(request.imageUrl().trim());
        }

        throw new BadRequestException("At least one product image is required.");
    }

    private List<String> resolveUpdateImageUrls(Product product, UpsertProductRequest request, List<MultipartFile> images) {
        List<MultipartFile> uploaded = sanitizeUploads(images);
        validateImageCount(uploaded.size());

        if (!uploaded.isEmpty()) {
            return uploaded.stream()
                    .map(storageService::storeProductImage)
                    .toList();
        }

        List<String> existing = currentImageUrls(product);
        if (StringUtils.hasText(request.imageUrl())) {
            if (existing.isEmpty()) {
                return List.of(request.imageUrl().trim());
            }
            List<String> updated = new ArrayList<>(existing);
            updated.set(0, request.imageUrl().trim());
            return updated;
        }

        if (existing.isEmpty()) {
            throw new BadRequestException("At least one product image is required.");
        }
        return existing;
    }

    private List<String> currentImageUrls(Product product) {
        List<String> urls = product.getImages().stream()
                .map(ProductImage::getImageUrl)
                .toList();
        if (urls.isEmpty() && StringUtils.hasText(product.getImageUrl())) {
            return List.of(product.getImageUrl().trim());
        }
        return urls;
    }

    private void setProductImages(Product product, List<String> imageUrls) {
        validateImageCount(imageUrls.size());
        product.getImages().clear();

        for (int i = 0; i < imageUrls.size(); i++) {
            ProductImage productImage = new ProductImage();
            productImage.setProduct(product);
            productImage.setImageUrl(imageUrls.get(i));
            productImage.setSortOrder(i);
            product.getImages().add(productImage);
        }

        product.setImageUrl(imageUrls.isEmpty() ? null : imageUrls.get(0));
    }

    private List<MultipartFile> sanitizeUploads(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return List.of();
        }
        return files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();
    }

    private void validateImageCount(int count) {
        if (count > MAX_PRODUCT_IMAGES) {
            throw new BadRequestException("Maximum 5 product images are allowed.");
        }
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
