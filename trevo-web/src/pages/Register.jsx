import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    type: "buyer",
    nif: "",
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

    // validação básica
    if (!form.name || !form.email || !form.password) {
      setError("Preenche todos os campos obrigatórios");
      return;
    }

    if (form.type === "owner" && !form.nif) {
      setError("NIF é obrigatório para Shop Owner");
      return;
    }

    setError("");

    // chamada ao register (fake por agora)
    register("token-registo-123");

    console.log("Dados enviados:", form);
  }

  return (
    <div style={{ padding: "20px", color: "black" }}>
      <h1>Register</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="name"
            placeholder="Nome"
            value={form.name}
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
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Tipo:</label>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="buyer">Buyer</option>
            <option value="owner">Shop Owner</option>
          </select>
        </div>

        {/* NIF só aparece para owner */}
        {form.type === "owner" && (
          <div>
            <input
              type="text"
              name="nif"
              placeholder="NIF"
              value={form.nif}
              onChange={handleChange}
            />
          </div>
        )}

        <button type="submit">Registar</button>
      </form>
    </div>
  );
}