import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { createPaymentIntent } from "../services/paymentService";

function getErrorMessage(error, fallback, unavailableMessage) {
  if (error.response?.status === 409) {
    return unavailableMessage;
  }

  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    error.message ||
    fallback
  );
}

function StripePaymentFormFields({ order, onSuccess }) {
  const { t } = useTranslation("checkout");
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!stripe || !elements || isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const paymentIntent = await createPaymentIntent(order.id);
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        setError(result.error.message || t("confirmStripePaymentFailed"));
        return;
      }

      onSuccess(result.paymentIntent);
    } catch (submitError) {
      setError(
        getErrorMessage(
          submitError,
          t("startStripePaymentFailed"),
          t("stripeUnavailableForOrder")
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-panel mt-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black">{t("stripePayment")}</h3>
        <span className="badge">Stripe</span>
      </div>
      <div className="mt-3 rounded-lg border border-black/10 bg-white p-4 shadow-inner">
        <CardElement />
      </div>
      {error && (
        <p className="alert alert-error mt-3 text-sm" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("confirmingStripePayment") : t("confirmStripePayment")}
      </button>
    </form>
  );
}

export default function StripePaymentForm({ order, onSuccess, stripePromise }) {
  const { t } = useTranslation("checkout");

  if (!stripePromise) {
    return (
      <p className="alert alert-error mt-5" role="alert">
        {t("stripeNotConfigured")}
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripePaymentFormFields order={order} onSuccess={onSuccess} />
    </Elements>
  );
}
