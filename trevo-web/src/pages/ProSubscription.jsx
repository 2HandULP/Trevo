import { useEffect, useState } from "react";
import {
  cancelSubscription,
  createSubscription,
  getProStatus,
} from "../services/subscriptionService";

const PRO_PRICE = "9,99 EUR / mes";

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

export default function ProSubscription() {
  const [isPro, setIsPro] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProStatus() {
      try {
        const status = await getProStatus();

        if (active) {
          setIsPro(Boolean(status.pro));
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, "Nao foi possivel carregar a subscricao"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProStatus();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubscribe() {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await createSubscription();
      setIsPro(true);
      setSuccess("Subscricao Pro ativa.");
    } catch (subscribeError) {
      setError(getErrorMessage(subscribeError, "Nao foi possivel ativar a subscricao Pro"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await cancelSubscription();
      setIsPro(false);
      setSuccess("Subscricao Pro cancelada.");
    } catch (cancelError) {
      setError(getErrorMessage(cancelError, "Nao foi possivel cancelar a subscricao Pro"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto my-10 max-w-3xl px-4 text-black">
      <p className="text-sm font-semibold uppercase text-gray-500">Plano Pro</p>
      <h1 className="mt-1 text-3xl font-semibold">Subscricao Pro</h1>

      {isLoading && (
        <p className="mt-6" aria-live="polite">
          A carregar subscricao...
        </p>
      )}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-6 text-green-600" role="status" aria-live="polite">
          {success}
        </p>
      )}

      {!isLoading && (
        <section className="mt-8 border border-gray-200 p-6" aria-label="Detalhes do plano Pro">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Trevo Pro</h2>
              <p className="mt-2 text-gray-700">
                Acesso ao plano Pro para usar funcionalidades premium da conta buyer.
              </p>
            </div>
            <p className="text-2xl font-semibold">{PRO_PRICE}</p>
          </div>

          <ul className="mt-6 list-disc space-y-2 pl-5 text-gray-700">
            <li>Estado Pro associado a tua conta buyer.</li>
            <li>Gestao simples da subscricao nesta pagina.</li>
            <li>Podes cancelar a subscricao quando ja nao precisares.</li>
          </ul>

          {isPro ? (
            <div className="mt-8 border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">Subscricao ativa</p>
              <p className="mt-2 text-sm text-green-700">
                O teu plano Pro esta ativo.
              </p>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="mt-5 border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "A cancelar..." : "Cancelar subscricao"}
              </button>
            </div>
          ) : (
            <div className="mt-8 border border-gray-200 bg-gray-50 p-4">
              <p className="font-semibold">Ainda nao tens Pro ativo.</p>
              <p className="mt-2 text-sm text-gray-700">
                Ativa a subscricao Pro para associar este plano a tua conta buyer.
              </p>
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isSubmitting}
                className="mt-5 bg-black px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "A subscrever..." : "Subscrever Pro"}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
