import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
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
    <main className="mx-auto my-10 max-w-4xl px-4 text-black">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-gray-500">
            {t("receiptInvoice")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {order ? t("orderNumber", { id: order.id }) : t("receiptTitle")}
          </h1>
        </div>
        {order && (
          <button
            type="button"
            onClick={() => downloadReceiptPdf(order)}
            className="border border-gray-300 px-4 py-2 font-semibold"
          >
            {t("downloadPdf")}
          </button>
        )}
      </div>

      {isLoading && (
        <p className="mt-6" aria-live="polite">
          {t("loadingReceipt")}
        </p>
      )}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <p className="mt-6 text-gray-600">
          {t("receiptNotFound")}
        </p>
      )}

      {!isLoading && !error && order && (
        <section className="mt-8 border border-gray-200 p-5" aria-label={t("receiptData")}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-600">{t("orderNumberLabel")}</dt>
              <dd className="font-semibold">#{order.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{t("date")}</dt>
              <dd className="font-semibold">{formatDate(order.createdAt, t)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{t("paymentMethod")}</dt>
              <dd className="font-semibold">{order.paymentMethod || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{t("status")}</dt>
              <dd className="font-semibold">{statusLabel(order.status, t)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{t("shop")}</dt>
              <dd className="font-semibold">{order.shopName || "N/A"}</dd>
            </div>
          </dl>

          <h2 className="mt-8 text-xl font-semibold">{t("items")}</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-gray-600">{t("emptyItems")}</p>
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
                      {t("quantityUnit", { quantity: item.quantity, unitPrice: formatPrice(item.unitPrice) })}
                    </p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.subtotal)}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-right text-2xl font-semibold">
            {t("total")}: {formatPrice(order.totalAmount)}
          </p>
        </section>
      )}
    </main>
  );
}
