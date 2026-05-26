import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const successMessage = location.state?.message || "";

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.email || !form.password) {
      setError(t("fillEmailAndPassword"));
      return;
    }

    try {
      setIsSubmitting(true);
      await login(form);
      setError("");
      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || t("invalidCredentials"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-lg border border-black/10 bg-white shadow-[var(--shadow-soft)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-[linear-gradient(145deg,#0f5132,#17201b)] p-8 text-white sm:p-10">
          <p className="text-sm font-black uppercase text-white/70">{t("authEyebrow")}</p>
          <h1 className="mt-4 text-4xl font-black">{t("loginTitle")}</h1>
          <p className="mt-4 leading-7 text-white/78">{t("loginDescription")}</p>
          <div className="mt-10 rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="text-sm text-white/78">{t("newToTrevo")}</p>
            <Link to="/register" className="mt-3 inline-flex font-black text-white underline underline-offset-4">
              {t("registerLink")}
            </Link>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          {successMessage && (
            <p className="alert alert-success" role="status" aria-live="polite">
              {successMessage}
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
                value={form.email}
                onChange={handleChange}
              />
            </label>

            <label className="form-field">
              <span className="form-label">{t("password")}</span>
              <input
                className="form-input"
                type="password"
                name="password"
                placeholder={t("password")}
                value={form.password}
                onChange={handleChange}
              />
            </label>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting ? t("loginSubmitting") : t("loginSubmit")}
            </button>
          </form>

          <p className="mt-5 text-sm font-bold text-[var(--color-muted)]">
            <Link className="text-[var(--color-primary)] underline-offset-4 hover:underline" to="/forgot-password">
              {t("forgotPasswordLink")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
