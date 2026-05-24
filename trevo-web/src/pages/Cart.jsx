import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
    <main className="mx-auto my-10 max-w-5xl px-4 text-black">
      <h1 className="text-3xl font-semibold">{t("cart")}</h1>

      {isLoading && <p className="mt-6">{t("loadingCart")}</p>}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <p className="mt-6 text-gray-600">{t("emptyCart")}</p>
      )}

      {!isLoading && !error && shops.length > 0 && (
        <div className="mt-8 space-y-8">
          {shops.map((shop) => (
            <section
              key={shop.shopId}
              aria-labelledby={`shop-${shop.shopId}`}
              className="border-b border-gray-200 pb-6"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 id={`shop-${shop.shopId}`} className="text-xl font-semibold">
                  {shop.shopName}
                </h2>
                <p className="font-semibold">
                  {t("subtotal")}: {formatPrice(shop.subtotal)}
                </p>
              </div>

              <ul className="mt-4 space-y-4">
                {shop.items.map((item) => {
                  const isPending = pendingVariantId === item.variantId;

                  return (
                    <li
                      key={item.cartItemId || item.variantId}
                      className="grid gap-4 border border-gray-200 p-4 md:grid-cols-[96px_minmax(0,1fr)_auto]"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={t("productImageAlt", { name: item.productName || t("unnamedProduct") })}
                          className="h-24 w-24 object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center bg-gray-100 text-sm text-gray-500">
                          {t("noImage")}
                        </div>
                      )}

                      <div>
                        <h3 className="font-semibold">{item.productName}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {t("sizeColor", { size: item.size || "N/A", color: item.color || "N/A" })}
                        </p>
                        <p className="mt-2 text-sm">
                          {t("unitPrice")}: {formatPrice(item.unitPrice)}
                        </p>
                        <p className="text-sm font-semibold">
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
                          className="h-9 w-9 border border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          -
                        </button>
                        <span aria-label={t("quantityOf", { name: item.productName })}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(item, item.quantity + 1)
                          }
                          disabled={isPending}
                          aria-label={t("increaseQuantity", { name: item.productName })}
                          className="h-9 w-9 border border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          disabled={isPending}
                          className="ml-2 border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
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

          <div className="flex justify-end">
            <p className="text-2xl font-semibold">
              {t("grandTotal")}: {formatPrice(cart.grandTotal)}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
