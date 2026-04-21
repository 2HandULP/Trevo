import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
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
      setError("Preenche email e password");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(form);
      setError("");
      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Credenciais inválidas");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "20px", color: "black" }}>
      <h1>Login</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <form onSubmit={handleSubmit}>
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
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "A entrar..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
