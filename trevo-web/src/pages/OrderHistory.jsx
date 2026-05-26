import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import StatusBadge from "../components/StatusBadge";
import { getBuyerOrder, getBuyerOrders } from "../services/orderService";

const statusLabelKeys = {
  PENDING_PAYMENT: "statuses.pendingPayment",
  PLACED: "statuses.placed",
  CONFIRMED: "statuses.confirmed",
  SHIPPED: "statuses.shipped",
  DELIVERED: "statuses.delivered",
  RETURNED: "statuses.returned",
  CANCELLED: "statuses.cancelled",
};

const PAGE_SIZE = 20;

function formatPrice(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(value, t) {
  if (!value) {
    return t("dateUnavailable");
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

function statusLabel(status, t) {
  return statusLabelKeys[status] ? t(statusLabelKeys[status]) : status;
}

export default function OrderHistory() {
  const { t } = useTranslation("orders");
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
          setError(getErrorMessage(loadError, t("loadOrdersFailed")));
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
  }, [page, t]);

  async function handleSelectOrder(orderId) {
    setSelectedOrder(null);
    setDetailError("");
    setIsLoadingDetail(true);

    try {
      const order = await getBuyerOrder(orderId);
      setSelectedOrder(order);
    } catch (selectError) {
      setDetailError(
        getErrorMessage(selectError, t("loadDetailsFailed"))
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
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("ordersHistory")}
        title={t("ordersHistory")}
        description="Acompanha estados, detalhes e recibos das tuas encomendas."
      />

      {isLoading && (
        <div className="h-72 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />
      )}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <div className="page-card p-8 text-center text-[var(--color-muted)]">{t("emptyOrders")}</div>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <section aria-label={t("orderList")}>
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectOrder(order.id)}
                    className="w-full rounded-lg border border-black/10 bg-white p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">{t("orderNumber", { id: order.id })}</p>
                      <StatusBadge status={order.status}>{statusLabel(order.status, t)}</StatusBadge>
                    </div>
                    <p className="mt-2 font-bold">{order.shopName}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {formatDate(order.createdAt, t)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span>{t("total")}: {formatPrice(order.totalAmount)}</span>
                      <span>{t("payment")}: {order.paymentMethod}</span>
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
                className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("previous", { ns: "common" })}
              </button>
              <span className="badge">
                {t("pageOf", { ns: "browse", page: page + 1, total: Math.max(totalPages, 1) })}
              </span>
              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={isLastPage}
                className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("next", { ns: "common" })}
              </button>
            </div>
          </section>

          <section aria-label={t("orderDetails")}>
            <h2 className="text-2xl font-black">{t("details")}</h2>
            {isLoadingDetail && (
              <div className="mt-4 h-56 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />
            )}
            {detailError && (
              <p className="alert alert-error mt-4" role="alert">
                {detailError}
              </p>
            )}
            {!isLoadingDetail && !detailError && !selectedOrder && (
              <p className="surface-panel mt-4 p-5 text-[var(--color-muted)]">
                {t("selectOrder")}
              </p>
            )}
            {!isLoadingDetail && !detailError && selectedOrder && (
              <div className="page-card mt-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-black">
                    {t("orderNumber", { id: selectedOrder.id })}
                  </h3>
                  <StatusBadge status={selectedOrder.status}>{statusLabel(selectedOrder.status, t)}</StatusBadge>
                </div>
                <p className="mt-2">{selectedOrder.shopName}</p>
                {selectedOrder.trackingNumber && (
                  <p className="mt-2 text-sm">
                    {t("tracking")}: {selectedOrder.trackingNumber}
                  </p>
                )}

                <ul className="mt-5 space-y-3">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id} className="border-t border-black/10 pt-3">
                      <div className="flex justify-between gap-4">
                        <div>
                          <p className="font-black">{item.productName}</p>
                          <p className="text-sm text-[var(--color-muted)]">
                            {t("sizeColor", { size: item.size || "N/A", color: item.color || "N/A" })}
                          </p>
                          <p className="text-sm text-[var(--color-muted)]">
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

                <p className="mt-5 text-xl font-black">
                  {t("total")}: {formatPrice(selectedOrder.totalAmount)}
                </p>
                <Link
                  to={`/orders/${selectedOrder.id}/receipt`}
                  className="btn btn-secondary mt-5"
                >
                  {t("viewReceipt")}
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
