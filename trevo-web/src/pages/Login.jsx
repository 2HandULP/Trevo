import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
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

    if (!form.email || !form.password) {
      setError("Preenche email e password");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(form);
      setError("");
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Credenciais inválidas");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "20px", color: "black" }}>
      <h1>Login</h1>
      {location.state?.message && <p style={{ color: "green" }}>{location.state.message}</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "A entrar..." : "Entrar"}
        </button>
      </form>

      <p>
        Ainda não tens conta? <Link to="/register">Registar</Link>
      </p>
    </div>
  );
}
