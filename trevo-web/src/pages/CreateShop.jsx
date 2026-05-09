import { useState } from "react";
import { createShop } from "../services/shopService";

const initialForm = {
  name: "",
  description: "",
  nif: "",
};

export default function CreateShop() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!form.name.trim() || !form.description.trim() || !form.nif.trim()) {
      setError("Preenche nome, descrição e NIF");
      return;
    }

    if (!/^\d{9}$/.test(form.nif.trim())) {
      setError("O NIF deve ter exatamente 9 dígitos");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      nif: form.nif.trim(),
    };

    try {
      setIsSubmitting(true);
      await createShop(payload);
      setSuccess("Loja criada com sucesso");
      setForm(initialForm);
    } catch (submitError) {
      setError(
        submitError.response?.data?.message ||
          submitError.response?.data?.detail ||
          "Não foi possível criar a loja"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto my-16 max-w-lg p-8 text-black">
      <h1>Criar loja</h1>

      {error && (
        <p className="text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-green-600" role="status" aria-live="polite">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="shop-name">Nome da loja</label>
          <input
            id="shop-name"
            type="text"
            name="name"
            placeholder="Nome da loja"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="shop-description">Descrição</label>
          <textarea
            id="shop-description"
            name="description"
            placeholder="Descrição"
            value={form.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="shop-nif">NIF</label>
          <input
            id="shop-nif"
            type="text"
            name="nif"
            placeholder="NIF"
            value={form.nif}
            onChange={handleChange}
          />
        </div>

        {/* TODO: implementar upload de logo/banner quando o backend suportar ficheiros. */}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "A criar..." : "Criar loja"}
        </button>
      </form>
    </div>
  );
}
