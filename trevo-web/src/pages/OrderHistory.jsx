import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
    <main className="mx-auto my-10 max-w-5xl px-4 text-black">
      <h1 className="text-3xl font-semibold">{t("ordersHistory")}</h1>

      {isLoading && (
        <p className="mt-6" aria-live="polite">
          {t("loadingOrders")}
        </p>
      )}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <p className="mt-6 text-gray-600">{t("emptyOrders")}</p>
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
                    className="w-full border border-gray-200 p-4 text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">{t("orderNumber", { id: order.id })}</p>
                      <span className="border border-gray-300 px-2 py-1 text-xs font-semibold">
                        {statusLabel(order.status, t)}
                      </span>
                    </div>
                    <p className="mt-2">{order.shopName}</p>
                    <p className="text-sm text-gray-600">
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
                className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("previous", { ns: "common" })}
              </button>
              <span className="text-sm text-gray-600">
                {t("pageOf", { ns: "browse", page: page + 1, total: Math.max(totalPages, 1) })}
              </span>
              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={isLastPage}
                className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("next", { ns: "common" })}
              </button>
            </div>
          </section>

          <section aria-label={t("orderDetails")}>
            <h2 className="text-xl font-semibold">{t("details")}</h2>
            {isLoadingDetail && (
              <p className="mt-4" aria-live="polite">
                {t("loadingDetails")}
              </p>
            )}
            {detailError && (
              <p className="mt-4 text-red-600" role="alert">
                {detailError}
              </p>
            )}
            {!isLoadingDetail && !detailError && !selectedOrder && (
              <p className="mt-4 text-gray-600">
                {t("selectOrder")}
              </p>
            )}
            {!isLoadingDetail && !detailError && selectedOrder && (
              <div className="mt-4 border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">
                    {t("orderNumber", { id: selectedOrder.id })}
                  </h3>
                  <span className="border border-gray-300 px-2 py-1 text-xs font-semibold">
                    {statusLabel(selectedOrder.status, t)}
                  </span>
                </div>
                <p className="mt-2">{selectedOrder.shopName}</p>
                {selectedOrder.trackingNumber && (
                  <p className="mt-2 text-sm">
                    {t("tracking")}: {selectedOrder.trackingNumber}
                  </p>
                )}

                <ul className="mt-5 space-y-3">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id} className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between gap-4">
                        <div>
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-sm text-gray-600">
                            {t("sizeColor", { size: item.size || "N/A", color: item.color || "N/A" })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {t("quantityUnit", { quantity: item.quantity, unitPrice: formatPrice(item.unitPrice) })}
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
                  {t("total")}: {formatPrice(selectedOrder.totalAmount)}
                </p>
                <Link
                  to={`/orders/${selectedOrder.id}/receipt`}
                  className="mt-5 inline-block border border-gray-300 px-4 py-2 font-semibold"
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
