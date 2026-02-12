package com.ecommerce.backend.product;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("""
            select p from Product p
            where p.active = true
              and (:search is null or lower(p.name) like lower(concat('%', :search, '%')))
            """)
    Page<Product> searchActive(@Param("search") String search, Pageable pageable);

    @Query("""
            select p from Product p
            where (:search is null or lower(p.name) like lower(concat('%', :search, '%')))
            """)
    Page<Product> searchAll(@Param("search") String search, Pageable pageable);
}
