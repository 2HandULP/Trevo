import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import PurchaseSummary from "../components/PurchaseSummary";
import {
  getCart,
  removeCartItem,
  updateCartItem,
} from "../services/cartService";

function formatPrice(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

export default function Cart() {
  const { t } = useTranslation("checkout");
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVariantId, setPendingVariantId] = useState(null);

  async function loadCart() {
    const loadedCart = await getCart();
    setCart(loadedCart);
    setError("");
  }

  useEffect(() => {
    let active = true;

    async function loadInitialCart() {
      try {
        const loadedCart = await getCart();

        if (active) {
          setCart(loadedCart);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, t("loadCartFailed")));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInitialCart();

    return () => {
      active = false;
    };
  }, [t]);

  async function handleQuantityChange(item, nextQuantity) {
    if (nextQuantity < 1) {
      return;
    }

    try {
      setPendingVariantId(item.variantId);
      const updatedCart = await updateCartItem(item.variantId, nextQuantity);
      setCart(updatedCart);
      setError("");
    } catch (updateError) {
      setError(getErrorMessage(updateError, t("updateCartFailed")));
    } finally {
      setPendingVariantId(null);
    }
  }

  async function handleRemove(item) {
    try {
      setPendingVariantId(item.variantId);
      await removeCartItem(item.variantId);
      await loadCart();
    } catch (removeError) {
      setError(getErrorMessage(removeError, t("removeItemFailed")));
    } finally {
      setPendingVariantId(null);
    }
  }

  const shops = cart?.shops || [];
  const isEmpty = !isLoading && !error && shops.length === 0;

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("cart")}
        title={t("cart")}
        description="Revê os artigos, ajusta quantidades e confirma o total antes de finalizar."
      />

      {isLoading && <div className="h-72 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <div className="page-card p-8 text-center text-[var(--color-muted)]">{t("emptyCart")}</div>
      )}

      {!isLoading && !error && shops.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {shops.map((shop) => (
              <section
                key={shop.shopId}
                aria-labelledby={`shop-${shop.shopId}`}
                className="page-card p-5"
              >
                <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4">
                  <h2 id={`shop-${shop.shopId}`} className="text-xl font-black">
                    {shop.shopName}
                  </h2>
                  <p className="font-black">
                    {t("subtotal")}: {formatPrice(shop.subtotal)}
                  </p>
                </div>

                <ul className="mt-4 space-y-4">
                  {shop.items.map((item) => {
                    const isPending = pendingVariantId === item.variantId;

                    return (
                      <li
                        key={item.cartItemId || item.variantId}
                        className="grid gap-4 rounded-lg border border-black/10 bg-[var(--color-surface-raised)] p-4 md:grid-cols-[112px_minmax(0,1fr)_auto]"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={t("productImageAlt", { name: item.productName || t("unnamedProduct") })}
                            className="h-28 w-28 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-white text-sm font-bold text-[var(--color-muted)]">
                            {t("noImage")}
                          </div>
                        )}

                        <div>
                          <h3 className="text-lg font-black">{item.productName}</h3>
                          <p className="mt-1 text-sm text-[var(--color-muted)]">
                            {t("sizeColor", { size: item.size || "N/A", color: item.color || "N/A" })}
                          </p>
                          <p className="mt-2 text-sm">
                            {t("unitPrice")}: {formatPrice(item.unitPrice)}
                          </p>
                          <p className="text-sm font-black">
                            {t("subtotal")}: {formatPrice(item.subtotal)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 md:justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(item, item.quantity - 1)
                            }
                            disabled={isPending || item.quantity <= 1}
                            aria-label={t("decreaseQuantity", { name: item.productName })}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white font-black disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="min-w-8 text-center font-black" aria-label={t("quantityOf", { name: item.productName })}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(item, item.quantity + 1)
                            }
                            disabled={isPending}
                            aria-label={t("increaseQuantity", { name: item.productName })}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white font-black disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            disabled={isPending}
                            className="btn btn-secondary ml-2 min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {t("remove")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <PurchaseSummary
            title={t("orderSummary")}
            rows={shops.map((shop) => ({ label: shop.shopName, value: formatPrice(shop.subtotal) }))}
            totalLabel={t("grandTotal")}
            total={formatPrice(cart.grandTotal)}
          >
            <Link to="/checkout" className="btn btn-primary w-full">
              {t("checkout")}
            </Link>
          </PurchaseSummary>
        </div>
      )}
    </main>
  );
}
