CREATE TABLE product_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO product_images (product_id, image_url, sort_order)
SELECT p.id, p.image_url, 0
FROM products p
WHERE p.image_url IS NOT NULL
  AND p.image_url <> '';

CREATE INDEX idx_product_images_product_sort ON product_images(product_id, sort_order, id);
