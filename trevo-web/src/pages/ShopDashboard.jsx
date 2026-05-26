import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
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
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("shopDashboard")}
        title={shop?.name || t("shopDashboard")}
        description={shop?.description || t("loadingDashboard")}
        actions={<Link to="/shop/payouts" className="btn bg-white text-[var(--color-primary-dark)]">{t("viewPayouts")}</Link>}
      />

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-3" aria-live="polite">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}

      {!isLoading && !error && shop && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label={t("revenue")} value={formatRevenue(revenue.total, revenue.currency)} />
            <MetricCard label={t("orders")} value={orders.length} />
            <article className="data-card">
              <p className="text-sm font-black uppercase text-[var(--color-muted)]">{t("status")}</p>
              <p className="sr-only">{t("status")}: {getStatusLabel(shop.status, t)}</p>
              <div className="mt-4">
                <StatusBadge status={shop.status}>{getStatusLabel(shop.status, t)}</StatusBadge>
              </div>
            </article>
          </div>

          <section className="page-card mt-8 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-black">{t("orders")}</h2>
              <Link to="/shop/orders" className="btn btn-secondary">Ver encomendas</Link>
            </div>
            {orders.length === 0 ? (
              <p className="mt-6 text-[var(--color-muted)]">{t("noOrders")}</p>
            ) : (
              <ul className="mt-6 divide-y divide-black/10">
                {orders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-4 py-4">
                    <span className="font-black">#{order.id}</span>
                    <StatusBadge status={order.status}>{getOrderStatusLabel(order.status, t)}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
