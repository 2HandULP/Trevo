import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.email || !form.password) {
      setError("Preenche email e password");
      return;
    }

    // login fake para já
    if (form.email === "teste@teste.com" && form.password === "1234") {
      login("token-login-123");
      setError("");
      navigate("/");
    } else {
      setError("Credenciais inválidas");
    }
  }

  return (
    <div style={{ padding: "20px", color: "black" }}>
      <h1>Login</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

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

        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
