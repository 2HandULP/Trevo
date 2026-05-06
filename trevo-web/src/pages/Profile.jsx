import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    error.message ||
    fallback
  );
}

export default function Profile() {
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
          setError(getErrorMessage(loadError, "Nao foi possivel carregar o perfil"));

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
  }, [logout, navigate]);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setError("Preenche nome e email");
      return;
    }

    if (
      (form.currentPassword && !form.newPassword) ||
      (!form.currentPassword && form.newPassword)
    ) {
      setError("Preenche a password atual e a nova password");
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    };

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
      setSuccess("Perfil atualizado com sucesso");
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Nao foi possivel atualizar o perfil"));

      if (updateError.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "32rem", margin: "4rem auto", padding: "2rem", color: "black" }}>
      <h1>Perfil</h1>

      {isLoading && <p>A carregar perfil...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      {!isLoading && (
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
              type="text"
              name="phone"
              placeholder="Telefone"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div>
            <input
              type="password"
              name="currentPassword"
              placeholder="Password atual"
              value={form.currentPassword}
              onChange={handleChange}
            />
          </div>

          <div>
            <input
              type="password"
              name="newPassword"
              placeholder="Nova password"
              value={form.newPassword}
              onChange={handleChange}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "A guardar..." : "Guardar alteracoes"}
          </button>
        </form>
      )}
    </div>
  );
}
