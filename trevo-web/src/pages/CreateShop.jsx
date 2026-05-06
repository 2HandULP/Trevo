import { useEffect, useState } from "react";
import { createShop } from "../services/shopService";

const initialForm = {
  name: "",
  description: "",
  nif: "",
};

function createImagePreview(file) {
  if (!file) {
    return "";
  }

  return URL.createObjectURL(file);
}

export default function CreateShop() {
  const [form, setForm] = useState(initialForm);
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const preview = createImagePreview(logo);
    setLogoPreview(preview);

    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [logo]);

  useEffect(() => {
    const preview = createImagePreview(banner);
    setBannerPreview(preview);

    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [banner]);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;

    if (event.target.name === "logo") {
      setLogo(file);
      return;
    }

    setBanner(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.description.trim() || !form.nif.trim()) {
      setError("Preenche nome, descricao e NIF");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      nif: form.nif.trim(),
      logoUrl: null,
      bannerUrl: null,
    };

    try {
      setIsSubmitting(true);
      await createShop(payload);
      setSuccess("Loja criada com sucesso");
    } catch (submitError) {
      setError(
        submitError.response?.data?.message ||
          submitError.response?.data?.detail ||
          submitError.message ||
          "Nao foi possivel criar a loja"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "32rem", margin: "4rem auto", padding: "2rem", color: "black" }}>
      <h1>Criar loja</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="name"
            placeholder="Nome da loja"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <textarea
            name="description"
            placeholder="Descricao"
            value={form.description}
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

        <div>
          <input type="file" name="logo" accept="image/*" onChange={handleFileChange} />
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Pre-visualizacao do logo"
              style={{ display: "block", maxWidth: "8rem", marginTop: "0.5rem" }}
            />
          )}
        </div>

        <div>
          <input type="file" name="banner" accept="image/*" onChange={handleFileChange} />
          {bannerPreview && (
            <img
              src={bannerPreview}
              alt="Pre-visualizacao do banner"
              style={{ display: "block", maxWidth: "16rem", marginTop: "0.5rem" }}
            />
          )}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "A criar..." : "Criar loja"}
        </button>
      </form>
    </div>
  );
}
