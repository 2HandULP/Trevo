import { useEffect, useMemo, useState } from "react";
import { redirectTo } from "../lib/checkoutRedirect";
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

export default function Checkout() {
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("MBWAY");
  const [mbWayPhone, setMbWayPhone] = useState("");
  const [mbWayMessage, setMbWayMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          setError(getErrorMessage(loadError, "Não foi possível carregar o checkout"));
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
  }, []);

  const shops = cart?.shops || [];
  const isEmpty = !isLoading && !error && shops.length === 0 && orders.length === 0;
  const hasValidCart = shops.length > 0;
  const isConfirmDisabled =
    isSubmitting || orders.length > 0 || !hasValidCart || !paymentMethod;
  const normalizedMbWayPhone = normalizeMbWayPhone(mbWayPhone);
  const isMbWaySubmitDisabled =
    isSubmitting || orders.length > 0 || !hasValidCart || !normalizedMbWayPhone;
  const successTotal = useMemo(() => orderTotal(orders), [orders]);

  function handlePaymentMethodChange(event) {
    setPaymentMethod(event.target.value);
    setError("");
    setMbWayMessage("");
  }

  async function handleConfirm() {
    if (isSubmitting) return;
    if (orders.length > 0) return;
    if (!hasValidCart || !paymentMethod) return;

    setError("");

    try {
      setIsSubmitting(true);
      const createdOrders = await checkoutOrder(paymentMethod);
      setOrders(createdOrders);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, "Não foi possível confirmar a encomenda"));
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
      // PAY-F02 is frontend/mock-ready because PayPal HTTP endpoints are not exposed yet.
      redirectTo(PAYPAL_MOCK_REDIRECT_URL);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, "Não foi possível iniciar o PayPal"));
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
      // PAY-F02 is frontend/mock-ready because MB WAY HTTP endpoints are not exposed yet.
      setMbWayMessage(`Pedido MB WAY iniciado para o número ${normalizedMbWayPhone}`);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, "Não foi possível iniciar o MB WAY"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (orders.length > 0) {
    return (
      <main className="mx-auto my-10 max-w-4xl px-4 text-black">
        <h1 className="text-3xl font-semibold">Encomenda confirmada</h1>
        <p className="mt-4 text-gray-700">
          O checkout foi registado com sucesso.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Encomendas criadas</h2>
          <ul className="mt-4 space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="border border-gray-200 p-4">
                <p className="font-semibold">
                  Encomenda n.º {order.id} - {order.shopName}
                </p>
                <p className="text-sm text-gray-700">Estado: {order.status}</p>
                <p className="text-sm text-gray-700">
                  Total: {formatPrice(order.totalAmount)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-2xl font-semibold">
            Total: {formatPrice(successTotal)}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto my-10 max-w-5xl px-4 text-black">
      <h1 className="text-3xl font-semibold">Checkout</h1>

      {isLoading && <p className="mt-6">A carregar checkout...</p>}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <p className="mt-6 text-gray-600">O carrinho está vazio.</p>
      )}

      {!isLoading && !isEmpty && shops.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section aria-labelledby="order-summary-title">
            <h2 id="order-summary-title" className="text-xl font-semibold">
              Resumo da encomenda
            </h2>

            <div className="mt-4 space-y-6">
              {shops.map((shop) => (
                <section key={shop.shopId} className="border-b border-gray-200 pb-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold">{shop.shopName}</h3>
                    <p className="font-semibold">
                      Subtotal: {formatPrice(shop.subtotal)}
                    </p>
                  </div>

                  <ul className="mt-3 space-y-3">
                    {shop.items.map((item) => (
                      <li key={item.cartItemId || item.variantId} className="text-sm">
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-semibold">{item.productName}</p>
                            <p className="text-gray-600">
                              Tamanho: {item.size || "N/A"} · Cor: {item.color || "N/A"}
                            </p>
                            <p className="text-gray-600">
                              Quantidade: {item.quantity} x {formatPrice(item.unitPrice)}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {formatPrice(item.subtotal)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <p className="mt-6 text-2xl font-semibold">
              Total geral: {formatPrice(cart.grandTotal)}
            </p>
          </section>

          <aside aria-labelledby="payment-title">
            <h2 id="payment-title" className="text-xl font-semibold">
              Pagamento
            </h2>

            <label className="mt-4 block text-sm font-semibold" htmlFor="paymentMethod">
              Método de pagamento
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={paymentMethod}
              onChange={handlePaymentMethodChange}
              className="mt-2 w-full border border-gray-300 p-2"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            {paymentMethod === "PAYPAL" && (
              <button
                type="button"
                onClick={handlePayPalPayment}
                disabled={isSubmitting || orders.length > 0 || !hasValidCart}
                className="mt-6 w-full bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "A iniciar PayPal..." : "Pagar com PayPal"}
              </button>
            )}

            {paymentMethod === "MBWAY" && (
              <form onSubmit={handleMbWayPayment} className="mt-5">
                <label className="block text-sm font-semibold" htmlFor="mbWayPhone">
                  Número de telemóvel
                </label>
                <input
                  id="mbWayPhone"
                  name="mbWayPhone"
                  type="tel"
                  value={mbWayPhone}
                  onChange={(event) => setMbWayPhone(event.target.value)}
                  className="mt-2 w-full border border-gray-300 p-2"
                />
                <button
                  type="submit"
                  disabled={isMbWaySubmitDisabled}
                  className="mt-4 w-full bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "A iniciar MB WAY..." : "Iniciar MB WAY"}
                </button>
                {mbWayMessage && (
                  <p className="mt-3 text-sm text-green-700" role="status">
                    {mbWayMessage}
                  </p>
                )}
              </form>
            )}

            {paymentMethod === "STRIPE" && (
              <>
                <div className="mt-5 border border-gray-200 bg-gray-50 p-4">
                  <h3 className="font-semibold">Pagamento pendente de integração</h3>
                  <p className="mt-2 text-sm text-gray-700">
                    O pagamento real ainda não está integrado nesta fase. A confirmação
                    cria as encomendas usando o método selecionado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled}
                  className="mt-6 w-full bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "A confirmar..." : "Confirmar encomenda"}
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
