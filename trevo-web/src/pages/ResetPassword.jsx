import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, validatePasswordResetToken } from "../lib/authApi";

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenStatus, setTokenStatus] = useState("checking");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function checkToken() {
      if (!token) {
        setTokenStatus("invalid");
        setError(t("missingResetToken"));
        return;
      }

      try {
        await validatePasswordResetToken(token);
        if (!ignore) {
          setTokenStatus("valid");
        }
      } catch (validationError) {
        if (!ignore) {
          setTokenStatus("invalid");
          setError(validationError.message);
        }
      }
    }

    checkToken();

    return () => {
      ignore = true;
    };
  }, [token, t]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    try {
      setIsSubmitting(true);
      await confirmPasswordReset(token, newPassword);
      navigate("/login", {
        replace: true,
        state: { message: t("passwordReset") },
      });
    } catch (submitError) {
      setError(submitError.message);
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
        <h1 className="mt-3 text-4xl font-black">{t("resetPasswordTitle")}</h1>
        <p className="mt-4 leading-7 text-[var(--color-muted)]">
          {t("resetPasswordDescription")}
        </p>

        {tokenStatus === "checking" && (
          <p className="alert mt-6 bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]" aria-live="polite">
            {t("validatingLink")}
          </p>
        )}
        {error && <p className="alert alert-error mt-6" role="alert">{error}</p>}

        {tokenStatus === "valid" && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="form-field">
              <span className="form-label">{t("newPassword")}</span>
              <input
                className="form-input"
                type="password"
                name="newPassword"
                placeholder={t("newPassword")}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>

            <label className="form-field">
              <span className="form-label">{t("confirmPassword")}</span>
              <input
                className="form-input"
                type="password"
                name="confirmPassword"
                placeholder={t("confirmPassword")}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting ? t("saving", { ns: "common" }) : t("resetPasswordSubmit")}
            </button>
          </form>
        )}

        {tokenStatus === "invalid" && (
          <p className="mt-6 text-center text-sm font-bold">
            <Link className="text-[var(--color-primary)] underline-offset-4 hover:underline" to="/forgot-password">
              {t("requestNewLink")}
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
