-- ============================================================
-- TREVO — Marketplace Database Schema
-- PostgreSQL 16
-- Migration: V1__create_schema.sql
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('BUYER', 'SHOP_OWNER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');
CREATE TYPE shop_status AS ENUM ('PENDING', 'ACTIVE', 'DEACTIVATED');
CREATE TYPE product_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE order_status AS ENUM ('PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');
CREATE TYPE payment_method AS ENUM ('STRIPE', 'PAYPAL', 'MBWAY');

-- ============================================================
-- 2. USERS
-- ============================================================

CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(255)    NOT NULL,
    phone           VARCHAR(20),
    role            user_role       NOT NULL,
    status          user_status     NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

-- ============================================================
-- 3. SHOPS
-- ============================================================

CREATE TABLE shops (
    id              BIGSERIAL       PRIMARY KEY,
    owner_id        BIGINT          NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    logo_url        VARCHAR(512),
    banner_url      VARCHAR(512),
    nif             VARCHAR(9)      NOT NULL UNIQUE,
    status          shop_status     NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_shops_owner
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,

    CONSTRAINT chk_nif_format
        CHECK (nif ~ '^\d{9}$')
);

CREATE INDEX idx_shops_status ON shops (status);

-- ============================================================
-- 4. COLLECTIONS
-- ============================================================

CREATE TABLE collections (
    id              BIGSERIAL       PRIMARY KEY,
    shop_id         BIGINT          NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    display_order   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_collections_shop
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

CREATE INDEX idx_collections_shop ON collections (shop_id);

-- ============================================================
-- 5. PRODUCTS
-- ============================================================

CREATE TABLE products (
    id              BIGSERIAL       PRIMARY KEY,
    shop_id         BIGINT          NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT            NOT NULL,
    price           DECIMAL(10, 2)  NOT NULL,
    brand           VARCHAR(255)    NOT NULL,
    materials       VARCHAR(500),
    status          product_status  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_products_shop
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,

    CONSTRAINT chk_price_positive
        CHECK (price > 0)
);

CREATE INDEX idx_products_shop ON products (shop_id);
CREATE INDEX idx_products_status ON products (status);
CREATE INDEX idx_products_name ON products USING GIN (to_tsvector('portuguese', name));
CREATE INDEX idx_products_description ON products USING GIN (to_tsvector('portuguese', description));

-- ============================================================
-- 6. PRODUCT IMAGES
-- ============================================================

CREATE TABLE product_images (
    id              BIGSERIAL       PRIMARY KEY,
    product_id      BIGINT          NOT NULL,
    image_url       VARCHAR(512)    NOT NULL,
    display_order   INT             NOT NULL DEFAULT 0,

    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE INDEX idx_product_images_product ON product_images (product_id);

-- ============================================================
-- 7. VARIANTS
-- ============================================================

CREATE TABLE variants (
    id              BIGSERIAL       PRIMARY KEY,
    product_id      BIGINT          NOT NULL,
    size            VARCHAR(50)     NOT NULL,
    color           VARCHAR(50)     NOT NULL,
    stock           INT             NOT NULL DEFAULT 0,

    CONSTRAINT fk_variants_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,

    CONSTRAINT chk_stock_non_negative
        CHECK (stock >= 0),

    CONSTRAINT uq_variant_product_size_color
        UNIQUE (product_id, size, color)
);

CREATE INDEX idx_variants_product ON variants (product_id);
CREATE INDEX idx_variants_size ON variants (size);
CREATE INDEX idx_variants_color ON variants (color);

-- ============================================================
-- 8. PRODUCT ↔ COLLECTIONS (Many-to-Many)
-- ============================================================

CREATE TABLE product_collections (
    product_id      BIGINT          NOT NULL,
    collection_id   BIGINT          NOT NULL,

    PRIMARY KEY (product_id, collection_id),

    CONSTRAINT fk_pc_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,

    CONSTRAINT fk_pc_collection
        FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE
);

-- ============================================================
-- 9. CARTS
-- ============================================================

CREATE TABLE carts (
    id              BIGSERIAL       PRIMARY KEY,
    buyer_id        BIGINT          NOT NULL UNIQUE,

    CONSTRAINT fk_carts_buyer
        FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ============================================================
-- 10. CART ITEMS
-- ============================================================

CREATE TABLE cart_items (
    id              BIGSERIAL       PRIMARY KEY,
    cart_id         BIGINT          NOT NULL,
    variant_id      BIGINT          NOT NULL,
    quantity        INT             NOT NULL,

    CONSTRAINT fk_cart_items_cart
        FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,

    CONSTRAINT fk_cart_items_variant
        FOREIGN KEY (variant_id) REFERENCES variants (id) ON DELETE RESTRICT,

    CONSTRAINT chk_cart_quantity_positive
        CHECK (quantity > 0),

    CONSTRAINT uq_cart_variant
        UNIQUE (cart_id, variant_id)
);

-- ============================================================
-- 11. ORDERS
-- ============================================================

CREATE TABLE orders (
    id                  BIGSERIAL           PRIMARY KEY,
    buyer_id            BIGINT              NOT NULL,
    shop_id             BIGINT              NOT NULL,
    status              order_status        NOT NULL DEFAULT 'PLACED',
    tracking_number     VARCHAR(255),
    total_amount        DECIMAL(10, 2)      NOT NULL,
    commission_amount   DECIMAL(10, 2)      NOT NULL DEFAULT 0,
    payment_method      payment_method      NOT NULL,
    payment_reference   VARCHAR(255),
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_orders_buyer
        FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE RESTRICT,

    CONSTRAINT fk_orders_shop
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE RESTRICT,

    CONSTRAINT chk_total_positive
        CHECK (total_amount > 0),

    CONSTRAINT chk_commission_non_negative
        CHECK (commission_amount >= 0)
);

CREATE INDEX idx_orders_buyer ON orders (buyer_id);
CREATE INDEX idx_orders_shop ON orders (shop_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- ============================================================
-- 12. ORDER ITEMS
-- ============================================================

CREATE TABLE order_items (
    id              BIGSERIAL       PRIMARY KEY,
    order_id        BIGINT          NOT NULL,
    variant_id      BIGINT          NOT NULL,
    quantity        INT             NOT NULL,
    unit_price      DECIMAL(10, 2)  NOT NULL,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,

    CONSTRAINT fk_order_items_variant
        FOREIGN KEY (variant_id) REFERENCES variants (id) ON DELETE RESTRICT,

    CONSTRAINT chk_order_quantity_positive
        CHECK (quantity > 0),

    CONSTRAINT chk_unit_price_positive
        CHECK (unit_price > 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ============================================================
-- 13. REVIEWS
-- ============================================================

CREATE TABLE reviews (
    id              BIGSERIAL       PRIMARY KEY,
    buyer_id        BIGINT          NOT NULL,
    shop_id         BIGINT          NOT NULL,
    rating          INT             NOT NULL,
    comment         TEXT,
    response        TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_reviews_buyer
        FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE,

    CONSTRAINT fk_reviews_shop
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,

    CONSTRAINT chk_rating_range
        CHECK (rating BETWEEN 1 AND 5),

    CONSTRAINT uq_review_buyer_shop
        UNIQUE (buyer_id, shop_id)
);

CREATE INDEX idx_reviews_shop ON reviews (shop_id);

-- ============================================================
-- 14. SUBSCRIPTIONS (Pro Plan)
-- ============================================================

CREATE TABLE subscriptions (
    id                      BIGSERIAL               PRIMARY KEY,
    buyer_id                BIGINT                  NOT NULL,
    status                  subscription_status     NOT NULL DEFAULT 'ACTIVE',
    stripe_subscription_id  VARCHAR(255)            UNIQUE,
    start_date              TIMESTAMP               NOT NULL DEFAULT NOW(),
    end_date                TIMESTAMP,
    created_at              TIMESTAMP               NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_subscriptions_buyer
        FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_buyer ON subscriptions (buyer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);

-- ============================================================
-- 15. TRY-ON USAGE
-- ============================================================

CREATE TABLE tryon_usage (
    id                  BIGSERIAL       PRIMARY KEY,
    buyer_id            BIGINT          NOT NULL,
    product_id          BIGINT          NOT NULL,
    generation_count    INT             NOT NULL DEFAULT 0,

    CONSTRAINT fk_tryon_buyer
        FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE,

    CONSTRAINT fk_tryon_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,

    CONSTRAINT chk_generation_count_non_negative
        CHECK (generation_count >= 0),

    CONSTRAINT uq_tryon_buyer_product
        UNIQUE (buyer_id, product_id)
);

-- ============================================================
-- 16. TRY-ON GENERATED IMAGES
-- ============================================================

CREATE TABLE tryon_images (
    id              BIGSERIAL       PRIMARY KEY,
    usage_id        BIGINT          NOT NULL,
    image_url       VARCHAR(512)    NOT NULL,
    generated_at    TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tryon_images_usage
        FOREIGN KEY (usage_id) REFERENCES tryon_usage (id) ON DELETE CASCADE
);

CREATE INDEX idx_tryon_images_usage ON tryon_images (usage_id);

-- ============================================================
-- 17. USER PHOTOS (for "See it on yourself")
-- ============================================================

CREATE TABLE user_photos (
    id              BIGSERIAL       PRIMARY KEY,
    buyer_id        BIGINT          NOT NULL,
    photo_url       VARCHAR(512)    NOT NULL,
    uploaded_at     TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_user_photos_buyer
        FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_photos_buyer ON user_photos (buyer_id);

-- ============================================================
-- 18. REFRESH TOKENS (for JWT auth)
-- ============================================================

CREATE TABLE refresh_tokens (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL,
    token           VARCHAR(512)    NOT NULL UNIQUE,
    expires_at      TIMESTAMP       NOT NULL,
    revoked         BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token);

-- ============================================================
-- 19. PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE password_reset_tokens (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL,
    token           VARCHAR(512)    NOT NULL UNIQUE,
    expires_at      TIMESTAMP       NOT NULL,
    used            BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_token ON password_reset_tokens (token);

-- ============================================================
-- 20. NOTIFICATIONS (in-app)
-- ============================================================

CREATE TABLE notifications (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    message         TEXT            NOT NULL,
    read            BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE read = FALSE;

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_shops_updated_at
    BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
