import { useCallback, useEffect, useState } from "react";
import DashboardHeader from "../components/DashboardHeader";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import { getPayoutBalance, getPayoutHistory } from "../services/payoutService";

const PAGE_SIZE = 20;

const statusLabels = {
  PENDING: "Pendente",
  RELEASED: "Pago",
};

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status) {
  return statusLabels[status] || "Desconhecido";
}

export default function PayoutDashboard() {
  const [balance, setBalance] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayouts = useCallback(async (nextPage = 0, options = {}) => {
    const { isActive = () => true } = options;

    setIsLoading(true);
    setError("");

    try {
      const historyResponse = await getPayoutHistory({
        page: nextPage,
        size: PAGE_SIZE,
      });

      if (isActive()) {
        setPayouts(historyResponse.payouts || []);
        setPage(historyResponse.page ?? nextPage);
        setTotalPages(historyResponse.totalPages || 0);
      }
    } catch (loadError) {
      if (isActive()) {
        setError(getErrorMessage(loadError, "Não foi possível carregar pagamentos"));
      }
    } finally {
      if (isActive()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialPayouts() {
      setIsLoading(true);
      setError("");

      try {
        const [balanceResponse, historyResponse] = await Promise.all([
          getPayoutBalance(),
          getPayoutHistory({ page: 0, size: PAGE_SIZE }),
        ]);

        if (active) {
          setBalance(balanceResponse.pendingBalance ?? 0);
          setPayouts(historyResponse.payouts || []);
          setPage(historyResponse.page ?? 0);
          setTotalPages(historyResponse.totalPages || 0);
        }
      } catch (loadError) {
        if (active) {
          setError(
            getErrorMessage(loadError, "Não foi possível carregar pagamentos")
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInitialPayouts();

    return () => {
      active = false;
    };
  }, []);

  const hasPreviousPage = page > 0;
  const hasNextPage = page < totalPages - 1;
  const isEmpty = !isLoading && !error && payouts.length === 0;

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow="Loja"
        title="Pagamentos"
        description="Consulta saldo pendente e historico de pagamentos libertados."
      />

      {isLoading && <div className="h-72 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Saldo pendente" value={formatCurrency(balance)} detail="Montante ainda por libertar" />
          <MetricCard label="Pagamentos" value={payouts.length} detail="Nesta pagina" />
          <MetricCard label="Pagina" value={`${page + 1}/${Math.max(totalPages, 1)}`} />
        </div>
      )}

      {!isLoading && !error && (
        <section className="page-card mt-8 p-6">
          <h2 className="text-2xl font-black">Histórico de pagamentos</h2>

          {isEmpty ? (
            <div className="surface-panel mt-4 p-6 text-center text-[var(--color-muted)]">
              Ainda não existem pagamentos.
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-black/10 bg-[var(--color-surface-raised)]">
                      <th className="px-4 py-3 text-sm font-black uppercase text-[var(--color-muted)]">Data</th>
                      <th className="px-4 py-3 text-sm font-black uppercase text-[var(--color-muted)]">Montante</th>
                      <th className="px-4 py-3 text-sm font-black uppercase text-[var(--color-muted)]">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-black/5">
                        <td className="px-4 py-3">
                          {formatDate(payout.releasedAt || payout.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-black">
                          {formatCurrency(payout.payoutAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={payout.status}>{getStatusLabel(payout.status)}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => loadPayouts(page - 1)}
                    disabled={!hasPreviousPage || isLoading}
                    className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPayouts(page + 1)}
                    disabled={!hasNextPage || isLoading}
                    className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Seguinte
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
