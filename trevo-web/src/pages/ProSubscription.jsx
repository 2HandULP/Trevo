import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
    <main className="mx-auto my-10 max-w-3xl px-4 text-black">
      <p className="text-sm font-semibold uppercase text-gray-500">{t("proPlan")}</p>
      <h1 className="mt-1 text-3xl font-semibold">{t("proSubscription")}</h1>

      {isLoading && (
        <p className="mt-6" aria-live="polite">
          {t("loadingSubscription")}
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
        <section className="mt-8 border border-gray-200 p-6" aria-label={t("proPlan")}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">{t("trevoPro")}</h2>
              <p className="mt-2 text-gray-700">
                {t("proDescription")}
              </p>
            </div>
            <p className="text-2xl font-semibold">{t("proPrice")}</p>
          </div>

          <ul className="mt-6 list-disc space-y-2 pl-5 text-gray-700">
            <li>{t("proBenefitAccount")}</li>
            <li>{t("proBenefitManage")}</li>
            <li>{t("proBenefitCancel")}</li>
          </ul>

          {isPro ? (
            <div className="mt-8 border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">{t("subscriptionActive")}</p>
              <p className="mt-2 text-sm text-green-700">
                {t("proActiveMessage")}
              </p>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="mt-5 border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t("canceling") : t("cancelSubscription")}
              </button>
            </div>
          ) : (
            <div className="mt-8 border border-gray-200 bg-gray-50 p-4">
              <p className="font-semibold">{t("noActivePro")}</p>
              <p className="mt-2 text-sm text-gray-700">
                {t("activateProMessage")}
              </p>
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isSubmitting}
                className="mt-5 bg-black px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
