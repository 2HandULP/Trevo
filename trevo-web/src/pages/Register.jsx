import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
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
  const [successMessage, setSuccessMessage] = useState("");
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
      setError("Preenche todos os campos obrigatórios");
      return;
    }

    if (form.type === "owner" && (!form.nif || !form.shopName)) {
      setError("Shop name e NIF sao obrigatorios para Shop Owner");
      return;
    }

    try {
      setIsSubmitting(true);
      await register(form);
      setError("");
      setSuccessMessage("Conta criada com sucesso. Podes agora fazer login.");
      navigate("/login");
    } catch (error) {
      setSuccessMessage("");
      setError(error.response?.data?.message || "Nao foi possivel concluir o registo");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "20px", color: "black" }}>
      <h1>Register</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

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
            placeholder="Password"
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
          <label>Tipo:</label>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="buyer">Buyer</option>
            <option value="owner">Shop Owner</option>
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
          {isSubmitting ? "A registar..." : "Registar"}
        </button>
      </form>
    </div>
  );
}
