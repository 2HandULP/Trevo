import { useEffect, useMemo, useState } from "react";
import { getCart } from "../services/cartService";
import { checkoutOrder } from "../services/orderService";

const paymentMethods = [
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
    error.response?.data?.detail ||
    error.response?.data?.message ||
    fallback
  );
}

function orderTotal(orders) {
  return orders.reduce(
    (total, order) => total + Number(order.totalAmount || 0),
    0
  );
}

export default function Checkout() {
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("MBWAY");
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
          setError(getErrorMessage(loadError, "Nao foi possivel carregar o checkout"));
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
  const successTotal = useMemo(() => orderTotal(orders), [orders]);

  async function handleConfirm() {
    setError("");

    try {
      setIsSubmitting(true);
      const createdOrders = await checkoutOrder(paymentMethod);
      setOrders(createdOrders);
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError, "Nao foi possivel confirmar a encomenda"));
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
          <h2 className="text-xl font-semibold">Orders criadas</h2>
          <ul className="mt-4 space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="border border-gray-200 p-4">
                <p className="font-semibold">
                  Order #{order.id} - {order.shopName}
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
        <p className="mt-6 text-gray-600">O carrinho esta vazio.</p>
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
              Metodo de pagamento
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="mt-2 w-full border border-gray-300 p-2"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            <div className="mt-5 border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold">Payment placeholder</h3>
              <p className="mt-2 text-sm text-gray-700">
                O pagamento real ainda nao esta integrado nesta fase. A confirmacao
                cria as orders usando o metodo selecionado.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="mt-6 w-full bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "A confirmar..." : "Confirmar encomenda"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
