import { useEffect, useMemo, useState } from "react";
import DashboardHeader from "../components/DashboardHeader";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import { getShopOrders, updateOrderStatus } from "../services/orderService";

const PAGE_SIZE = 20;

const statusLabels = {
  PLACED: "Recebida",
  CONFIRMED: "Confirmada",
  SHIPPED: "Enviada",
  DELIVERED: "Entregue",
};

const statusTabs = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

const nextStatusByStatus = {
  PLACED: "CONFIRMED",
  CONFIRMED: "SHIPPED",
  SHIPPED: "DELIVERED",
};

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function ordersFromResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.orders)) {
    return response.orders;
  }

  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return [];
}

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

function statusLabel(status) {
  return statusLabels[status] || status;
}

function actionLabel(status) {
  const nextStatus = nextStatusByStatus[status];

  if (!nextStatus) {
    return "";
  }

  return `Marcar como ${statusLabel(nextStatus).toLowerCase()}`;
}

export default function OrderManagement() {
  const [orderPage, setOrderPage] = useState(null);
  const [page, setPage] = useState(0);
  const [activeStatus, setActiveStatus] = useState("PLACED");
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setIsLoading(true);
      setError("");
      setUpdateError("");

      try {
        const orders = await getShopOrders({ page, size: PAGE_SIZE });

        if (active) {
          setOrderPage(orders);
        }
      } catch (loadError) {
        if (active) {
          setError(
            getErrorMessage(loadError, "Nao foi possivel carregar as encomendas")
          );
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

  const orders = useMemo(() => ordersFromResponse(orderPage), [orderPage]);
  const filteredOrders = useMemo(
    () => orders.filter((order) => order.status === activeStatus),
    [activeStatus, orders]
  );
  const totalPages = orderPage?.totalPages || 0;
  const isFirstPage = page === 0;
  const isLastPage = totalPages === 0 || page >= totalPages - 1;
  const isEmpty = !isLoading && !error && filteredOrders.length === 0;

  async function retryLoad() {
    setIsLoading(true);
    setError("");
    setUpdateError("");

    try {
      setOrderPage(await getShopOrders({ page, size: PAGE_SIZE }));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar as encomendas"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateStatus(order) {
    const nextStatus = nextStatusByStatus[order.status];

    if (!nextStatus) {
      return;
    }

    setUpdatingOrderId(order.id);
    setUpdateError("");

    try {
      const updatedOrder = await updateOrderStatus(order.id, nextStatus);
      const nextOrder = {
        ...order,
        ...(updatedOrder || {}),
        status: updatedOrder?.status || nextStatus,
      };

      setOrderPage((currentPage) => {
        if (!currentPage) {
          return currentPage;
        }

        if (Array.isArray(currentPage)) {
          return currentPage.map((currentOrder) =>
            currentOrder.id === order.id ? nextOrder : currentOrder
          );
        }

        if (Array.isArray(currentPage.orders)) {
          return {
            ...currentPage,
            orders: currentPage.orders.map((currentOrder) =>
              currentOrder.id === order.id ? nextOrder : currentOrder
            ),
          };
        }

        if (Array.isArray(currentPage.content)) {
          return {
            ...currentPage,
            content: currentPage.content.map((currentOrder) =>
              currentOrder.id === order.id ? nextOrder : currentOrder
            ),
          };
        }

        return currentPage;
      });
      setActiveStatus(nextStatus);
    } catch (updateStatusError) {
      setUpdateError(
        getErrorMessage(
          updateStatusError,
          "Nao foi possivel atualizar o estado da encomenda"
        )
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow="Loja"
        title="Gestao de encomendas"
        description="Acompanha pedidos por estado e avanca cada encomenda no fluxo operacional."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {statusTabs.map((status) => (
          <MetricCard
            key={status}
            label={statusLabel(status)}
            value={orders.filter((order) => order.status === status).length}
          />
        ))}
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Estados">
        {statusTabs.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setActiveStatus(status)}
            className={`btn min-h-10 px-4 py-2 text-sm ${
              activeStatus === status ? "btn-primary" : "btn-secondary"
            }`}
          >
            {statusLabel(status)}
          </button>
        ))}
      </nav>

      {isLoading && <div className="mt-6 h-64 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />}

      {error && (
        <div className="alert alert-error mt-6 space-y-3" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retryLoad} className="btn btn-secondary">
            Tentar novamente
          </button>
        </div>
      )}

      {updateError && <p className="alert alert-error mt-6" role="alert">{updateError}</p>}

      {isEmpty && (
        <div className="page-card mt-6 p-8 text-center text-[var(--color-muted)]">
          Nao existem encomendas neste estado.
        </div>
      )}

      {!isLoading && !error && filteredOrders.length > 0 && (
        <section className="mt-8" aria-label="Encomendas da loja">
          <ul className="space-y-4">
            {filteredOrders.map((order) => {
              const nextStatus = nextStatusByStatus[order.status];

              return (
                <li key={order.id} className="rounded-lg border border-black/10 bg-white p-5 shadow-[var(--shadow-card)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-black">Order #{order.id}</h2>
                        <StatusBadge status={order.status}>{statusLabel(order.status)}</StatusBadge>
                      </div>
                      {order.buyerName && (
                        <p className="mt-2 text-sm text-gray-700">
                          Cliente: {order.buyerName}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-gray-600">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="mt-3 font-black">
                        Total: {formatPrice(order.totalAmount)}
                      </p>
                    </div>

                    {nextStatus && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order)}
                        disabled={updatingOrderId === order.id}
                        className="btn btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingOrderId === order.id
                          ? "A atualizar..."
                          : actionLabel(order.status)}
                      </button>
                    )}
                  </div>

                  {Array.isArray(order.items) && order.items.length > 0 && (
                    <ul className="mt-4 divide-y divide-black/10 border-t border-black/10">
                      {order.items.map((item) => (
                        <li
                          key={item.id || `${item.productId}-${item.variantId}`}
                          className="flex flex-wrap justify-between gap-3 py-3 text-sm"
                        >
                          <span>
                            {item.productName} x {item.quantity}
                          </span>
                          <span>{formatPrice(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={isFirstPage}
              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="badge">
              Pagina {page + 1} de {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={isLastPage}
              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Seguinte
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
