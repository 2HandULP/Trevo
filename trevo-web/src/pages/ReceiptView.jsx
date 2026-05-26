import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import StatusBadge from "../components/StatusBadge";
import { downloadReceiptPdf } from "../lib/receiptDownload";
import { getBuyerOrder } from "../services/orderService";

const statusLabelKeys = {
  PENDING_PAYMENT: "statuses.pendingPayment",
  PLACED: "statuses.placed",
  CONFIRMED: "statuses.confirmed",
  SHIPPED: "statuses.shipped",
  DELIVERED: "statuses.delivered",
  RETURNED: "statuses.returned",
  CANCELLED: "statuses.cancelled",
};

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
  return statusLabelKeys[status] ? t(statusLabelKeys[status]) : status || "N/A";
}

export default function ReceiptView() {
  const { t } = useTranslation("orders");
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
          setError(getErrorMessage(loadError, t("loadReceiptFailed")));
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
  }, [orderId, t]);

  const items = order?.items || [];
  const isEmpty = !isLoading && !error && !order;

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("receiptInvoice")}
        title={order ? t("orderNumber", { id: order.id }) : t("receiptTitle")}
        description="Documento limpo com dados essenciais da encomenda."
        actions={order && (
          <button type="button" onClick={() => downloadReceiptPdf(order)} className="btn bg-white text-[var(--color-primary-dark)]">
            {t("downloadPdf")}
          </button>
        )}
      />

      {isLoading && (
        <div className="h-72 animate-pulse rounded-lg bg-white p-6 shadow-[var(--shadow-card)]" aria-live="polite">
          {t("loadingReceipt")}
        </div>
      )}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <p className="page-card p-8 text-center text-[var(--color-muted)]">
          {t("receiptNotFound")}
        </p>
      )}

      {!isLoading && !error && order && (
        <section className="page-card mx-auto max-w-4xl p-6 sm:p-8" aria-label={t("receiptData")}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-bold text-[var(--color-muted)]">{t("orderNumberLabel")}</dt>
              <dd className="font-black">#{order.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[var(--color-muted)]">{t("date")}</dt>
              <dd className="font-black">{formatDate(order.createdAt, t)}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[var(--color-muted)]">{t("paymentMethod")}</dt>
              <dd className="font-black">{order.paymentMethod || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[var(--color-muted)]">{t("status")}</dt>
              <dd className="mt-1"><StatusBadge status={order.status}>{statusLabel(order.status, t)}</StatusBadge></dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[var(--color-muted)]">{t("shop")}</dt>
              <dd className="font-black">{order.shopName || "N/A"}</dd>
            </div>
          </dl>

          <h2 className="mt-8 text-2xl font-black">{t("items")}</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-[var(--color-muted)]">{t("emptyItems")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-black/10">
              {items.map((item) => (
                <li
                  key={item.id || `${item.productId}-${item.variantId}`}
                  className="flex flex-wrap justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-black">{item.productName}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {t("quantityUnit", { quantity: item.quantity, unitPrice: formatPrice(item.unitPrice) })}
                    </p>
                  </div>
                  <p className="font-black">{formatPrice(item.subtotal)}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 border-t border-black/10 pt-6 text-right text-2xl font-black">
            {t("total")}: {formatPrice(order.totalAmount)}
          </p>
        </section>
      )}
    </main>
  );
}
