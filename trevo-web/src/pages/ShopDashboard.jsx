import { useEffect, useState } from "react";
import { getShopDashboard } from "../services/shopService";

const statusLabels = {
  PENDING: "Pendente",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
};

function getStatusLabel(status) {
  return statusLabels[status] || "Desconhecido";
}

function formatRevenue(total, currency) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(total);
}

export default function ShopDashboard() {
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
              "Não foi possível carregar o dashboard da loja"
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
  }, []);

  const shop = dashboard?.shop;
  const orders = dashboard?.orders || [];
  const revenue = dashboard?.revenue || { total: 0, currency: "EUR" };

  return (
    <div className="mx-auto my-16 max-w-3xl p-8 text-black">
      <h1>Dashboard da loja</h1>

      {isLoading && <p aria-live="polite">A carregar dashboard...</p>}
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
            <p>Estado: {getStatusLabel(shop.status)}</p>
          </section>

          <section>
            <h2>Receita</h2>
            <p>{formatRevenue(revenue.total, revenue.currency)}</p>
          </section>

          <section>
            <h2>Encomendas</h2>
            {orders.length === 0 ? (
              <p>Ainda não existem encomendas.</p>
            ) : (
              <ul>
                {orders.map((order) => (
                  <li key={order.id}>
                    #{order.id} - {order.status}
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
