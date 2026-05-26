import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import { useAuth } from "../hooks/useAuth";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "../services/userService";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  currentPassword: "",
  newPassword: "",
};

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

export default function Profile() {
  const { t } = useTranslation("profile");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const profile = await getCurrentUserProfile();

        if (active) {
          setForm({
            fullName: profile.fullName || "",
            email: profile.email || "",
            phone: profile.phone || "",
            currentPassword: "",
            newPassword: "",
          });
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, t("loadProfileFailed")));

          if (loadError.response?.status === 401) {
            logout();
            navigate("/login", { replace: true });
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [logout, navigate, t]);

  function handleChange(event) {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setError(t("fillNameEmail"));
      return;
    }

    if (
      (form.currentPassword && !form.newPassword) ||
      (!form.currentPassword && form.newPassword)
    ) {
      setError(t("fillPasswords"));
      return;
    }

    if (form.newPassword && form.newPassword.length < 8) {
      setError(t("newPasswordTooShort"));
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    };

    // TODO: adicionar verificação de email quando o backend suportar este fluxo.
    if (form.currentPassword || form.newPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }

    try {
      setIsSubmitting(true);
      const updatedProfile = await updateCurrentUserProfile(payload);

      setForm({
        fullName: updatedProfile.fullName || "",
        email: updatedProfile.email || "",
        phone: updatedProfile.phone || "",
        currentPassword: "",
        newPassword: "",
      });
      setSuccess(t("profileUpdated"));
    } catch (updateError) {
      setError(getErrorMessage(updateError, t("updateProfileFailed")));

      if (updateError.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("profile")}
        title={t("profile")}
        description={t("loadingProfile")}
      />

      {isLoading && <div className="h-96 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />}
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
        <form onSubmit={handleSubmit} className="page-card mx-auto max-w-2xl space-y-5 p-6 sm:p-8">
          <label className="form-field">
            <span className="form-label">{t("name")}</span>
            <input
              className="form-input"
              type="text"
              name="fullName"
              placeholder={t("name")}
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
            <span className="form-label">{t("phone")}</span>
            <input
              className="form-input"
              type="text"
              name="phone"
              placeholder={t("phone")}
              value={form.phone}
              onChange={handleChange}
            />
          </label>

          <label className="form-field">
            <span className="form-label">{t("currentPassword", { ns: "auth" })}</span>
            <input
              className="form-input"
              type="password"
              name="currentPassword"
              placeholder={t("currentPassword", { ns: "auth" })}
              value={form.currentPassword}
              onChange={handleChange}
            />
          </label>

          <label className="form-field">
            <span className="form-label">{t("newPassword", { ns: "auth" })}</span>
            <input
              className="form-input"
              type="password"
              name="newPassword"
              placeholder={t("newPassword", { ns: "auth" })}
              value={form.newPassword}
              onChange={handleChange}
            />
          </label>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
            {isSubmitting ? t("saving") : t("saveChanges")}
          </button>
        </form>
      )}
    </main>
  );
}
