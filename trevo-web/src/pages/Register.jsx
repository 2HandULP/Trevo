import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { t } = useTranslation("auth");
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    type: "buyer",
    shopName: "",
    nif: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.fullName || !form.email || !form.password) {
      setError(t("fillRequiredFields"));
      return;
    }

    if (form.type === "owner" && (!form.nif || !form.shopName)) {
      setError(t("shopOwnerRequired"));
      return;
    }

    try {
      setIsSubmitting(true);
      await register(form);
      setError("");
      navigate("/login", {
        state: { message: t("accountCreated") },
      });
    } catch (error) {
      setError(error.response?.data?.message || t("registerFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="mx-auto grid max-w-6xl overflow-hidden rounded-lg border border-black/10 bg-white shadow-[var(--shadow-soft)] lg:grid-cols-[0.8fr_1.2fr]">
        <div className="bg-[linear-gradient(145deg,#17201b,#0f5132)] p-8 text-white sm:p-10">
          <p className="text-sm font-black uppercase text-white/70">{t("authEyebrow")}</p>
          <h1 className="mt-4 text-4xl font-black">{t("registerTitle")}</h1>
          <p className="mt-4 leading-7 text-white/78">{t("registerDescription")}</p>
          <div className="mt-10 rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="text-sm text-white/78">{t("alreadyHaveAccount")}</p>
            <Link to="/login" className="mt-3 inline-flex font-black text-white underline underline-offset-4">
              {t("loginLink")}
            </Link>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          {error && <p className="alert alert-error" role="alert">{error}</p>}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="form-field md:col-span-2">
              <span className="form-label">{t("fullName")}</span>
              <input
                className="form-input"
                type="text"
                name="fullName"
                placeholder={t("fullName")}
                value={form.fullName}
                onChange={handleChange}
              />
            </label>

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

            <label className="form-field">
              <span className="form-label">{t("phoneOptional")}</span>
              <input
                className="form-input"
                type="text"
                name="phone"
                placeholder={t("phoneOptional")}
                value={form.phone}
                onChange={handleChange}
              />
            </label>

            <label className="form-field">
              <span className="form-label">{t("type")}</span>
              <select className="form-input" name="type" value={form.type} onChange={handleChange}>
                <option value="buyer">{t("buyer")}</option>
                <option value="owner">{t("shopOwner")}</option>
              </select>
            </label>

            {form.type === "owner" && (
              <>
                <label className="form-field">
                  <span className="form-label">{t("shopName")}</span>
                  <input
                    className="form-input"
                    type="text"
                    name="shopName"
                    placeholder={t("shopName")}
                    value={form.shopName}
                    onChange={handleChange}
                  />
                </label>

                <label className="form-field">
                  <span className="form-label">{t("nif")}</span>
                  <input
                    className="form-input"
                    type="text"
                    name="nif"
                    placeholder={t("nif")}
                    value={form.nif}
                    onChange={handleChange}
                  />
                </label>
              </>
            )}

            <button type="submit" disabled={isSubmitting} className="btn btn-primary md:col-span-2">
              {isSubmitting ? t("registerSubmitting") : t("registerSubmit")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
