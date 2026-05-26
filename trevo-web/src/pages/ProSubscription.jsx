import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardHeader from "../components/DashboardHeader";
import StatusBadge from "../components/StatusBadge";
import {
  cancelSubscription,
  createSubscription,
  getProStatus,
} from "../services/subscriptionService";

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

export default function ProSubscription() {
  const { t } = useTranslation("shop");
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
          setError(getErrorMessage(loadError, t("loadSubscriptionFailed")));
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
  }, [t]);

  async function handleSubscribe() {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await createSubscription();
      setIsPro(true);
      setSuccess(t("subscriptionActivated"));
    } catch (subscribeError) {
      setError(getErrorMessage(subscribeError, t("activateSubscriptionFailed")));
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
      setSuccess(t("subscriptionCanceled"));
    } catch (cancelError) {
      setError(getErrorMessage(cancelError, t("cancelSubscriptionFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("proPlan")}
        title={t("proSubscription")}
        description={t("proDescription")}
      />

      {isLoading && (
        <div className="h-72 animate-pulse rounded-lg bg-white p-6 shadow-[var(--shadow-card)]" aria-live="polite">
          {t("loadingSubscription")}
        </div>
      )}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="alert alert-success" role="status" aria-live="polite">
          {success}
        </p>
      )}

      {!isLoading && (
        <section className="page-card mx-auto max-w-4xl overflow-hidden" aria-label={t("proPlan")}>
          <div className="bg-[linear-gradient(135deg,#17201b,#0f5132)] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-4">
                <StatusBadge tone={isPro ? "success" : "neutral"}>
                  {isPro ? t("subscriptionActive") : t("noActivePro")}
                </StatusBadge>
              </div>
              <h2 className="text-3xl font-black">{t("trevoPro")}</h2>
              <p className="mt-2 max-w-xl text-white/78">
                {t("proDescription")}
              </p>
            </div>
            <p className="text-3xl font-black">{t("proPrice")}</p>
          </div>
          </div>

          <ul className="grid gap-3 p-6 text-[var(--color-muted)] sm:grid-cols-3">
            <li className="surface-panel p-4 font-bold">{t("proBenefitAccount")}</li>
            <li className="surface-panel p-4 font-bold">{t("proBenefitManage")}</li>
            <li className="surface-panel p-4 font-bold">{t("proBenefitCancel")}</li>
          </ul>

          {isPro ? (
            <div className="mx-6 mb-6 rounded-lg border border-green-200 bg-green-50 p-5">
              <p className="font-black text-green-800">{t("subscriptionActive")}</p>
              <p className="mt-2 text-sm text-green-700">
                {t("proActiveMessage")}
              </p>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="btn mt-5 border border-red-200 bg-white text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t("canceling") : t("cancelSubscription")}
              </button>
            </div>
          ) : (
            <div className="mx-6 mb-6 rounded-lg border border-black/10 bg-[var(--color-surface-raised)] p-5">
              <p className="font-black">{t("noActivePro")}</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {t("activateProMessage")}
              </p>
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isSubmitting}
                className="btn btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t("subscribing") : t("subscribePro")}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
