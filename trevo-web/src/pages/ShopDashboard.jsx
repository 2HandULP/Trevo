import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getShopDashboard } from "../services/shopService";

const statusLabelKeys = {
  PENDING: "statuses.pending",
  ACTIVE: "statuses.active",
  SUSPENDED: "statuses.suspended",
};

const orderStatusLabelKeys = {
  PENDING_PAYMENT: "statuses.pendingPayment",
  PLACED: "statuses.placed",
  CONFIRMED: "statuses.confirmed",
  SHIPPED: "statuses.shipped",
  DELIVERED: "statuses.delivered",
  RETURNED: "statuses.returned",
  CANCELLED: "statuses.cancelled",
};

function getStatusLabel(status, t) {
  return statusLabelKeys[status] ? t(statusLabelKeys[status]) : t("unknown");
}

function getOrderStatusLabel(status, t) {
  return orderStatusLabelKeys[status]
    ? t(orderStatusLabelKeys[status], { ns: "orders" })
    : t("unknown");
}

function formatRevenue(total, currency) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(total);
}

export default function ShopDashboard() {
  const { t } = useTranslation("shop");
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const shopDashboard = await getShopDashboard();

        if (active) {
          setDashboard(shopDashboard);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError.response?.data?.message ||
              loadError.response?.data?.detail ||
              t("loadDashboardFailed")
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [t]);

  const shop = dashboard?.shop;
  const orders = dashboard?.orders || [];
  const revenue = dashboard?.revenue || { total: 0, currency: "EUR" };

  return (
    <div className="mx-auto my-16 max-w-3xl p-8 text-black">
      <h1>{t("shopDashboard")}</h1>

      {isLoading && <p aria-live="polite">{t("loadingDashboard")}</p>}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      {!isLoading && !error && shop && (
        <>
          <section>
            <h2>{shop.name}</h2>
            <p>{shop.description}</p>
            <p>{t("status")}: {getStatusLabel(shop.status, t)}</p>
          </section>

          <section>
            <h2>{t("revenue")}</h2>
            <p>{formatRevenue(revenue.total, revenue.currency)}</p>
            <p>
              <Link to="/shop/payouts">{t("viewPayouts")}</Link>
            </p>
          </section>

          <section>
            <h2>{t("orders")}</h2>
            {orders.length === 0 ? (
              <p>{t("noOrders")}</p>
            ) : (
              <ul>
                {orders.map((order) => (
                  <li key={order.id}>
                    #{order.id} - {getOrderStatusLabel(order.status, t)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
