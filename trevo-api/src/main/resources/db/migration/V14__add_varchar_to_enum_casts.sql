-- ============================================================
-- V14: Implicit casts from varchar to custom enum types
--
-- Hibernate sends enum values as character varying (Types.VARCHAR)
-- via @Enumerated(EnumType.STRING). Without these casts PostgreSQL
-- rejects the binding with "expression is of type character varying".
--
-- Each function casts via ::text first to use PostgreSQL's built-in
-- text→enum cast, avoiding infinite recursion through the new
-- implicit varchar→enum cast.
-- ============================================================

CREATE OR REPLACE FUNCTION cast_varchar_to_user_role(varchar) RETURNS user_role
LANGUAGE SQL IMMUTABLE AS $$ SELECT $1::text::user_role $$;
CREATE CAST (character varying AS user_role)
    WITH FUNCTION cast_varchar_to_user_role(varchar) AS IMPLICIT;

CREATE OR REPLACE FUNCTION cast_varchar_to_user_status(varchar) RETURNS user_status
LANGUAGE SQL IMMUTABLE AS $$ SELECT $1::text::user_status $$;
CREATE CAST (character varying AS user_status)
    WITH FUNCTION cast_varchar_to_user_status(varchar) AS IMPLICIT;

CREATE OR REPLACE FUNCTION cast_varchar_to_shop_status(varchar) RETURNS shop_status
LANGUAGE SQL IMMUTABLE AS $$ SELECT $1::text::shop_status $$;
CREATE CAST (character varying AS shop_status)
    WITH FUNCTION cast_varchar_to_shop_status(varchar) AS IMPLICIT;

CREATE OR REPLACE FUNCTION cast_varchar_to_product_status(varchar) RETURNS product_status
LANGUAGE SQL IMMUTABLE AS $$ SELECT $1::text::product_status $$;
CREATE CAST (character varying AS product_status)
    WITH FUNCTION cast_varchar_to_product_status(varchar) AS IMPLICIT;

CREATE OR REPLACE FUNCTION cast_varchar_to_order_status(varchar) RETURNS order_status
LANGUAGE SQL IMMUTABLE AS $$ SELECT $1::text::order_status $$;
CREATE CAST (character varying AS order_status)
    WITH FUNCTION cast_varchar_to_order_status(varchar) AS IMPLICIT;

CREATE OR REPLACE FUNCTION cast_varchar_to_payment_method(varchar) RETURNS payment_method
LANGUAGE SQL IMMUTABLE AS $$ SELECT $1::text::payment_method $$;
CREATE CAST (character varying AS payment_method)
    WITH FUNCTION cast_varchar_to_payment_method(varchar) AS IMPLICIT;

CREATE OR REPLACE FUNCTION cast_varchar_to_subscription_status(varchar) RETURNS subscription_status
LANGUAGE SQL IMMUTABLE AS $$ SELECT $1::text::subscription_status $$;
CREATE CAST (character varying AS subscription_status)
    WITH FUNCTION cast_varchar_to_subscription_status(varchar) AS IMPLICIT;
