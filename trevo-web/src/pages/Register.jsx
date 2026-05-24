import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
    <div style={{ padding: "20px", color: "black" }}>
      <h1>{t("registerTitle")}</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="fullName"
            placeholder="Nome"
            value={form.fullName}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="password"
            name="password"
            placeholder={t("password")}
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="text"
            name="phone"
            placeholder="Telefone (opcional)"
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>{t("type")}</label>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="buyer">{t("buyer")}</option>
            <option value="owner">{t("shopOwner")}</option>
          </select>
        </div>

        {/* NIF só aparece para owner */}
        {form.type === "owner" && (
          <>
            <div>
              <input
                type="text"
                name="shopName"
                placeholder="Nome da loja"
                value={form.shopName}
                onChange={handleChange}
              />
            </div>

            <div>
              <input
                type="text"
                name="nif"
                placeholder="NIF"
                value={form.nif}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("registerSubmitting") : t("registerSubmit")}
        </button>
      </form>
    </div>
  );
}
