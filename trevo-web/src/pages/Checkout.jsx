import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardHeader from "../components/DashboardHeader";
import StatusBadge from "../components/StatusBadge";
import { redirectTo } from "../lib/checkoutRedirect";
import { loadStripe } from "@stripe/stripe-js";
import StripePaymentForm from "./StripePaymentForm";
import { getCart } from "../services/cartService";
import { checkoutOrder } from "../services/orderService";

const PAYPAL_MOCK_REDIRECT_URL = "/checkout/paypal/mock";

const paymentMethods = [
  // Keep these values aligned with the backend PaymentMethod enum.
  { value: "MBWAY", label: "MB WAY" },
  { value: "STRIPE", label: "Stripe" },
  { value: "PAYPAL", label: "PayPal" },
];

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

function orderTotal(orders) {
  return orders.reduce(
    (total, order) => total + Number(order.totalAmount || 0),
    0
  );
}

function normalizeMbWayPhone(phoneNumber) {
  const normalized = phoneNumber.replace(/\s/g, "");

  if (/^9\d{8}$/.test(normalized)) {
    return normalized;
  }

  if (/^\+3519\d{8}$/.test(normalized)) {
    return normalized;
  }

  return "";
}

function getStripePublishableKey() {
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
}

export default function Checkout() {
  const { t } = useTranslation("checkout");
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pendingStripeOrders, setPendingStripeOrders] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("MBWAY");
  const [mbWayPhone, setMbWayPhone] = useState("");
  const [mbWayMessage, setMbWayMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const stripePublishableKey = getStripePublishableKey();
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey]
  );

  useEffect(() => {
    let active = true;

    async function loadCart() {
      try {
        const loadedCart = await getCart();

        if (active) {
          setCart(loadedCart);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, t("loadCheckoutFailed")));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadCart();

    return () => {
      active = false;
    };
  }, [t]);

  const shops = cart?.shops || [];
  const isEmpty = !isLoading && !error && shops.length === 0 && orders.length === 0;
  const hasValidCart = shops.length > 0;
  const isConfirmDisabled =
    isSubmitting ||
    orders.length > 0 ||
    pendingStripeOrders.length > 0 ||
    !hasValidCart ||
    !paymentMethod ||
    (paymentMethod === "STRIPE" && !stripePromise);
  const normalizedMbWayPhone = normalizeMbWayPhone(mbWayPhone);
  const isMbWaySubmitDisabled =
    isSubmitting || orders.length > 0 || !hasValidCart || !normalizedMbWayPhone;
  const successTotal = useMemo(() => orderTotal(orders), [orders]);
  const pendingStripeOrder = pendingStripeOrders[0] || null;

  function handlePaymentMethodChange(event) {
    setPaymentMethod(event.target.value);
    setError("");
    setMbWayMessage("");
  }

  async function handleConfirm() {
    if (isSubmitting) return;
    if (orders.length > 0) return;
    if (pendingStripeOrders.length > 0) return;
    if (!hasValidCart || !paymentMethod) return;
    if (paymentMethod === "STRIPE" && shops.length !== 1) {
      setError(t("stripeSingleShopOnly"));
      return;
    }
    if (paymentMethod === "STRIPE" && !stripePromise) {
      setError(t("stripeNotConfigured"));
      return;
    }

    setError("");

    try {
      setIsSubmitting(true);
      const createdOrders = await checkoutOrder(paymentMethod);

      if (paymentMethod === "STRIPE") {
        setPendingStripeOrders(createdOrders);
        return;
      }

      setOrders(createdOrders);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, t("confirmOrderFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePayPalPayment() {
    if (isSubmitting) return;
    if (orders.length > 0) return;
    if (!hasValidCart) return;

    setError("");
    setMbWayMessage("");

    try {
      setIsSubmitting(true);
      await checkoutOrder("PAYPAL");
      redirectTo(PAYPAL_MOCK_REDIRECT_URL);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, t("startPayPalFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMbWayPayment(event) {
    event.preventDefault();

    if (isMbWaySubmitDisabled) return;

    setError("");
    setMbWayMessage("");

    try {
      setIsSubmitting(true);
      await checkoutOrder("MBWAY", { phone: normalizedMbWayPhone });
      setMbWayMessage(t("mbWayStarted", { phone: normalizedMbWayPhone }));
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, t("startMbWayFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStripeSuccess() {
    setOrders(pendingStripeOrders);
    setPendingStripeOrders([]);
  }

  if (orders.length > 0) {
    return (
      <main className="page-shell">
        <DashboardHeader
          eyebrow={t("checkout")}
          title={t("orderConfirmed")}
          description={t("checkoutRegistered")}
        />

        <section className="page-card p-6">
          <h2 className="text-2xl font-black">{t("createdOrders")}</h2>
          <ul className="mt-4 space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-lg border border-black/10 bg-[var(--color-surface-raised)] p-4">
                <p className="font-black">
                  {t("orderNumberShop", { id: order.id, shopName: order.shopName })}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{t("status")}: {order.status}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {t("total")}: {formatPrice(order.totalAmount)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-2xl font-black">
            {t("total")}: {formatPrice(successTotal)}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("checkout")}
        title={t("checkout")}
        description="Confirma a encomenda e escolhe um metodo de pagamento seguro."
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

      {!isLoading && !isEmpty && shops.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="page-card p-6" aria-labelledby="order-summary-title">
            <h2 id="order-summary-title" className="text-2xl font-black">
              {t("orderSummary")}
            </h2>

            <div className="mt-4 space-y-6">
              {shops.map((shop) => (
                <section key={shop.shopId} className="rounded-lg border border-black/10 bg-[var(--color-surface-raised)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-black">{shop.shopName}</h3>
                    <p className="font-black">
                      {t("subtotal")}: {formatPrice(shop.subtotal)}
                    </p>
                  </div>

                  <ul className="mt-3 space-y-3">
                    {shop.items.map((item) => (
                      <li key={item.cartItemId || item.variantId} className="text-sm">
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-black">{item.productName}</p>
                            <p className="text-[var(--color-muted)]">
                              {t("sizeColor", { size: item.size || "N/A", color: item.color || "N/A" })}
                            </p>
                            <p className="text-[var(--color-muted)]">
                              {t("quantityUnit", { quantity: item.quantity, unitPrice: formatPrice(item.unitPrice) })}
                            </p>
                          </div>
                          <p className="font-black">
                            {formatPrice(item.subtotal)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <p className="mt-6 text-2xl font-black">
              {t("grandTotal")}: {formatPrice(cart.grandTotal)}
            </p>
          </section>

          <aside className="page-card h-fit p-6 lg:sticky lg:top-28" aria-labelledby="payment-title">
            <h2 id="payment-title" className="text-2xl font-black">
              {t("payment")}
            </h2>
            <div className="mt-4">
              <StatusBadge tone="success">Pagamento seguro</StatusBadge>
            </div>

            <label className="form-field mt-5" htmlFor="paymentMethod">
              <span className="form-label">
              {t("paymentMethod")}
              </span>
            <select
                className="form-input"
                id="paymentMethod"
                name="paymentMethod"
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>

            {paymentMethod === "PAYPAL" && (
              <button
                type="button"
                onClick={handlePayPalPayment}
                disabled={isSubmitting || orders.length > 0 || !hasValidCart}
                className="btn btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t("startingPayPal") : t("payWithPayPal")}
              </button>
            )}

            {paymentMethod === "MBWAY" && (
              <form onSubmit={handleMbWayPayment} className="mt-5 space-y-4">
                <label className="form-field" htmlFor="mbWayPhone">
                  <span className="form-label">
                  {t("phoneNumber")}
                  </span>
                <input
                    className="form-input"
                    id="mbWayPhone"
                    name="mbWayPhone"
                    type="tel"
                    value={mbWayPhone}
                    onChange={(event) => setMbWayPhone(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={isMbWaySubmitDisabled}
                  className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? t("startingMbWay") : t("startMbWay")}
                </button>
                {mbWayMessage && (
                  <p className="alert alert-success text-sm" role="status">
                    {mbWayMessage}
                  </p>
                )}
              </form>
            )}

            {paymentMethod === "STRIPE" && !stripePromise && (
              <p className="alert alert-error mt-5" role="alert">
                {t("stripeNotConfigured")}
              </p>
            )}

            {paymentMethod === "STRIPE" && pendingStripeOrder ? (
              <StripePaymentForm
                order={pendingStripeOrder}
                onSuccess={handleStripeSuccess}
                stripePromise={stripePromise}
              />
            ) : paymentMethod === "STRIPE" && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
                className="btn btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t("confirming") : t("confirmOrder")}
              </button>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
