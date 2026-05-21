import { useCallback, useEffect, useState } from "react";
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
      const [balanceResponse, historyResponse] = await Promise.all([
        getPayoutBalance(),
        getPayoutHistory({ page: nextPage, size: PAGE_SIZE }),
      ]);

      if (isActive()) {
        setBalance(balanceResponse.pendingBalance ?? 0);
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

    loadPayouts(0, { isActive: () => active });

    return () => {
      active = false;
    };
  }, [loadPayouts]);

  const hasPreviousPage = page > 0;
  const hasNextPage = page < totalPages - 1;
  const isEmpty = !isLoading && !error && payouts.length === 0;

  return (
    <main className="mx-auto my-10 max-w-5xl px-4 text-black">
      <h1 className="text-3xl font-semibold">Pagamentos</h1>

      {isLoading && (
        <p className="mt-6" aria-live="polite">
          A carregar pagamentos...
        </p>
      )}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}

      {!error && (
        <section className="mt-8 border border-gray-200 bg-gray-50 p-5">
          <h2 className="text-lg font-semibold">Saldo pendente</h2>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(balance)}</p>
        </section>
      )}

      {!isLoading && !error && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Histórico de pagamentos</h2>

          {isEmpty ? (
            <p className="mt-4 text-gray-600">Ainda não existem pagamentos.</p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 pr-4">Data</th>
                      <th className="py-3 pr-4">Montante</th>
                      <th className="py-3 pr-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-gray-100">
                        <td className="py-3 pr-4">
                          {formatDate(payout.releasedAt || payout.createdAt)}
                        </td>
                        <td className="py-3 pr-4">
                          {formatCurrency(payout.payoutAmount)}
                        </td>
                        <td className="py-3 pr-4">{getStatusLabel(payout.status)}</td>
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
                    className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPayouts(page + 1)}
                    disabled={!hasNextPage || isLoading}
                    className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
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
