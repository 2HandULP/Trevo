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
    <div style={{ maxWidth: "28rem", margin: "4rem auto", padding: "2rem", color: "black" }}>
      <h1>{t("forgotPasswordTitle")}</h1>
      <p>
        {t("forgotPasswordDescription")}
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {submitted && (
        <p style={{ color: "green" }}>
          {t("forgotPasswordSuccess")}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("forgotPasswordSubmitting") : t("forgotPasswordSubmit")}
        </button>
      </form>

      <p>
        <Link to="/login">{t("backToLogin")}</Link>
      </p>
    </div>
  );
}
