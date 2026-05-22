import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { downloadReceiptPdf } from "../lib/receiptDownload";
import { getBuyerOrder } from "../services/orderService";

const statusLabels = {
  PENDING_PAYMENT: "Pagamento pendente",
  PLACED: "Criada",
  CONFIRMED: "Confirmada",
  SHIPPED: "Enviada",
  DELIVERED: "Entregue",
  RETURNED: "Devolvida",
  CANCELLED: "Cancelada",
};

function formatPrice(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    "Nao foi possivel carregar o recibo"
  );
}

function statusLabel(status) {
  return statusLabels[status] || status || "N/A";
}

export default function ReceiptView() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      setIsLoading(true);
      setError("");

      try {
        const orderData = await getBuyerOrder(orderId);

        if (active) {
          setOrder(orderData);
        }
      } catch (loadError) {
        if (active) {
          setOrder(null);
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  const items = order?.items || [];
  const isEmpty = !isLoading && !error && !order;

  return (
    <main className="mx-auto my-10 max-w-4xl px-4 text-black">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-gray-500">
            Recibo / fatura
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {order ? `Encomenda #${order.id}` : "Recibo da encomenda"}
          </h1>
        </div>
        {order && (
          <button
            type="button"
            onClick={() => downloadReceiptPdf(order)}
            className="border border-gray-300 px-4 py-2 font-semibold"
          >
            Descarregar PDF
          </button>
        )}
      </div>

      {isLoading && (
        <p className="mt-6" aria-live="polite">
          A carregar recibo...
        </p>
      )}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <p className="mt-6 text-gray-600">
          Nao foi encontrado recibo para esta encomenda.
        </p>
      )}

      {!isLoading && !error && order && (
        <section className="mt-8 border border-gray-200 p-5" aria-label="Dados do recibo">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-600">Numero da encomenda</dt>
              <dd className="font-semibold">#{order.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Data</dt>
              <dd className="font-semibold">{formatDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Metodo de pagamento</dt>
              <dd className="font-semibold">{order.paymentMethod || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Estado</dt>
              <dd className="font-semibold">{statusLabel(order.status)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Loja</dt>
              <dd className="font-semibold">{order.shopName || "N/A"}</dd>
            </div>
          </dl>

          <h2 className="mt-8 text-xl font-semibold">Items</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-gray-600">Esta encomenda nao tem items.</p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-200">
              {items.map((item) => (
                <li
                  key={item.id || `${item.productId}-${item.variantId}`}
                  className="flex flex-wrap justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-semibold">{item.productName}</p>
                    <p className="text-sm text-gray-600">
                      Quantidade: {item.quantity} x {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.subtotal)}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-right text-2xl font-semibold">
            Total: {formatPrice(order.totalAmount)}
          </p>
        </section>
      )}
    </main>
  );
}
