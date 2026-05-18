import { useEffect, useState } from "react";
import { getBuyerOrder, getBuyerOrders } from "../services/orderService";

const statusLabels = {
  PENDING_PAYMENT: "Pagamento pendente",
  PLACED: "Criada",
  CONFIRMED: "Confirmada",
  SHIPPED: "Enviada",
  DELIVERED: "Entregue",
  RETURNED: "Devolvida",
  CANCELLED: "Cancelada",
};

const PAGE_SIZE = 20;

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

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function statusLabel(status) {
  return statusLabels[status] || status;
}

export default function OrderHistory() {
  const [orderPage, setOrderPage] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setIsLoading(true);
      setSelectedOrder(null);
      setDetailError("");

      try {
        const orders = await getBuyerOrders({ page, size: PAGE_SIZE });

        if (active) {
          setOrderPage(orders);
          setTotalPages(orders.totalPages || 0);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, "Nao foi possivel carregar as encomendas"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [page]);

  async function handleSelectOrder(orderId) {
    setSelectedOrder(null);
    setDetailError("");
    setIsLoadingDetail(true);

    try {
      const order = await getBuyerOrder(orderId);
      setSelectedOrder(order);
    } catch (selectError) {
      setDetailError(
        getErrorMessage(selectError, "Nao foi possivel carregar o detalhe")
      );
    } finally {
      setIsLoadingDetail(false);
    }
  }

  const orders = orderPage?.orders || [];
  const isEmpty = !isLoading && !error && orders.length === 0;
  const isFirstPage = page === 0;
  const isLastPage = totalPages === 0 || page >= totalPages - 1;

  return (
    <main className="mx-auto my-10 max-w-5xl px-4 text-black">
      <h1 className="text-3xl font-semibold">Historico de encomendas</h1>

      {isLoading && (
        <p className="mt-6" aria-live="polite">
          A carregar encomendas...
        </p>
      )}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <p className="mt-6 text-gray-600">Ainda nao existem encomendas.</p>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <section aria-label="Lista de encomendas">
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectOrder(order.id)}
                    className="w-full border border-gray-200 p-4 text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">Order #{order.id}</p>
                      <span className="border border-gray-300 px-2 py-1 text-xs font-semibold">
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="mt-2">{order.shopName}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(order.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span>Total: {formatPrice(order.totalAmount)}</span>
                      <span>Pagamento: {order.paymentMethod}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage - 1)}
                disabled={isFirstPage}
                className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {page + 1} de {Math.max(totalPages, 1)}
              </span>
              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={isLastPage}
                className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Seguinte
              </button>
            </div>
          </section>

          <section aria-label="Detalhe da encomenda">
            <h2 className="text-xl font-semibold">Detalhe</h2>
            {isLoadingDetail && (
              <p className="mt-4" aria-live="polite">
                A carregar detalhe...
              </p>
            )}
            {detailError && (
              <p className="mt-4 text-red-600" role="alert">
                {detailError}
              </p>
            )}
            {!isLoadingDetail && !detailError && !selectedOrder && (
              <p className="mt-4 text-gray-600">
                Seleciona uma encomenda para ver os detalhes.
              </p>
            )}
            {!isLoadingDetail && !detailError && selectedOrder && (
              <div className="mt-4 border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">
                    Order #{selectedOrder.id}
                  </h3>
                  <span className="border border-gray-300 px-2 py-1 text-xs font-semibold">
                    {statusLabel(selectedOrder.status)}
                  </span>
                </div>
                <p className="mt-2">{selectedOrder.shopName}</p>
                {selectedOrder.trackingNumber && (
                  <p className="mt-2 text-sm">
                    Tracking: {selectedOrder.trackingNumber}
                  </p>
                )}

                <ul className="mt-5 space-y-3">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id} className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between gap-4">
                        <div>
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-sm text-gray-600">
                            Tamanho: {item.size || "N/A"} · Cor:{" "}
                            {item.color || "N/A"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Quantidade: {item.quantity} x{" "}
                            {formatPrice(item.unitPrice)}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatPrice(item.subtotal)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="mt-5 text-xl font-semibold">
                  Total: {formatPrice(selectedOrder.totalAmount)}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
