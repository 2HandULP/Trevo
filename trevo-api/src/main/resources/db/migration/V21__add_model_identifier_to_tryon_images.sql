ALTER TABLE tryon_images
    ADD COLUMN model_identifier VARCHAR(255) NOT NULL DEFAULT 'default';

CREATE INDEX idx_tryon_images_product_model
    ON tryon_images (model_identifier, generated_at);
