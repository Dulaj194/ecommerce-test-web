package com.ecommerce.backend.product;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.backend.common.dto.PagedResponse;
import com.ecommerce.backend.product.dto.ProductResponse;
import com.ecommerce.backend.product.dto.UpsertProductRequest;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/admin/products")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductController {

    private final ProductService productService;

    public AdminProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public PagedResponse<ProductResponse> listProducts(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return productService.listAdmin(search, page, size);
    }

    @GetMapping("/{id}")
    public ProductResponse getById(@PathVariable Long id) {
        return productService.getAdminProduct(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody UpsertProductRequest request) {
        return productService.createProduct(request);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse createMultipart(
            @RequestParam @NotBlank @Size(max = 200) String name,
            @RequestParam(required = false) @Size(max = 5000) String description,
            @RequestParam @NotNull @DecimalMin("0.01") BigDecimal price,
            @RequestParam @PositiveOrZero int stock,
            @RequestParam(required = false) @Size(max = 500) String imageUrl,
            @RequestParam(defaultValue = "true") boolean active,
            @RequestPart(required = false) List<MultipartFile> images) {
        UpsertProductRequest request = new UpsertProductRequest(name, description, price, stock, imageUrl, active);
        return productService.createProduct(request, images);
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody UpsertProductRequest request) {
        return productService.updateProduct(id, request);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductResponse updateMultipart(
            @PathVariable Long id,
            @RequestParam @NotBlank @Size(max = 200) String name,
            @RequestParam(required = false) @Size(max = 5000) String description,
            @RequestParam @NotNull @DecimalMin("0.01") BigDecimal price,
            @RequestParam @PositiveOrZero int stock,
            @RequestParam(required = false) @Size(max = 500) String imageUrl,
            @RequestParam(defaultValue = "true") boolean active,
            @RequestPart(required = false) List<MultipartFile> images) {
        UpsertProductRequest request = new UpsertProductRequest(name, description, price, stock, imageUrl, active);
        return productService.updateProduct(id, request, images);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        productService.deleteProduct(id);
    }
}
