import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../lib/authApi";

export default function ForgotPassword() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitted(false);

    if (!email.trim()) {
      setError(t("fillEmail"));
      return;
    }

    try {
      setIsSubmitting(true);
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-xl page-card p-8 sm:p-10">
        <p className="text-sm font-black uppercase text-[var(--color-muted)]">
          {t("forgotPasswordEyebrow")}
        </p>
        <h1 className="mt-3 text-4xl font-black">{t("forgotPasswordTitle")}</h1>
        <p className="mt-4 leading-7 text-[var(--color-muted)]">
          {t("forgotPasswordDescription")}
        </p>

        {error && <p className="alert alert-error mt-6" role="alert">{error}</p>}
        {submitted && (
          <p className="alert alert-success mt-6" role="status" aria-live="polite">
            {t("forgotPasswordSuccess")}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="form-field">
            <span className="form-label">Email</span>
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
            {isSubmitting ? t("forgotPasswordSubmitting") : t("forgotPasswordSubmit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-bold text-[var(--color-muted)]">
          <Link className="text-[var(--color-primary)] underline-offset-4 hover:underline" to="/login">
            {t("backToLogin")}
          </Link>
        </p>
      </section>
    </main>
  );
}
