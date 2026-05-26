import { useState } from "react";
import DashboardHeader from "../components/DashboardHeader";
import { uploadImage } from "../services/imageUploadService";
import { createShop } from "../services/shopService";

const initialForm = {
  name: "",
  description: "",
  nif: "",
};

const initialImages = {
  logo: {
    file: null,
    previewUrl: "",
    progress: 0,
  },
  banner: {
    file: null,
    previewUrl: "",
    progress: 0,
  },
};

export default function CreateShop() {
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState(initialImages);
  const [imageInputResetKey, setImageInputResetKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  function handleImageChange(event) {
    const { name, files } = event.target;
    const file = files?.[0] || null;

    setImages((prev) => {
      if (prev[name].previewUrl) {
        URL.revokeObjectURL(prev[name].previewUrl);
      }

      return {
        ...prev,
        [name]: {
          file,
          previewUrl: file ? URL.createObjectURL(file) : "",
          progress: 0,
        },
      };
    });
  }

  function clearImages() {
    Object.values(images).forEach((image) => {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });

    setImages(initialImages);
    setImageInputResetKey((key) => key + 1);
  }

  async function uploadSelectedImage(fieldName) {
    const selectedImage = images[fieldName];

    if (!selectedImage.file) {
      return undefined;
    }

    setImages((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        progress: 1,
      },
    }));

    return uploadImage(selectedImage.file, (progress) => {
      setImages((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          progress,
        },
      }));
    });
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
      const [logoUrl, bannerUrl] = await Promise.all([
        uploadSelectedImage("logo"),
        uploadSelectedImage("banner"),
      ]);

      await createShop({
        ...payload,
        ...(logoUrl ? { logoUrl } : {}),
        ...(bannerUrl ? { bannerUrl } : {}),
      });
      setSuccess("Loja criada com sucesso");
      setForm(initialForm);
      clearImages();
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
    <main className="page-shell">
      <DashboardHeader
        eyebrow="Loja"
        title="Criar loja"
        description="Configura a tua presenca no marketplace com identidade visual, descricao e dados fiscais."
      />

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {success && (
        <p className="alert alert-success" role="status" aria-live="polite">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="page-card mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
        <label className="form-field" htmlFor="shop-name">
          <span className="form-label">Nome da loja</span>
          <input
            id="shop-name"
            type="text"
            name="name"
            placeholder="Nome da loja"
            value={form.name}
            onChange={handleChange}
            className="form-input"
          />
        </label>

        <label className="form-field" htmlFor="shop-description">
          <span className="form-label">Descricao</span>
          <textarea
            id="shop-description"
            name="description"
            placeholder="Descricao"
            value={form.description}
            onChange={handleChange}
            className="form-input min-h-32"
          />
        </label>

        <label className="form-field" htmlFor="shop-nif">
          <span className="form-label">NIF</span>
          <input
            id="shop-nif"
            type="text"
            name="nif"
            placeholder="NIF"
            value={form.nif}
            onChange={handleChange}
            className="form-input"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="surface-panel p-4">
            <label htmlFor="shop-logo" className="form-label">Logo</label>
            <input
              key={`logo-${imageInputResetKey}`}
              id="shop-logo"
              type="file"
              name="logo"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              className="mt-3 block w-full text-sm"
            />
            {images.logo.previewUrl && (
              <div className="mt-4">
                <img src={images.logo.previewUrl} alt="Pré-visualização do logo" className="aspect-square w-32 rounded-lg object-cover" />
                {images.logo.progress > 0 && (
                  <progress
                    aria-label="Progresso do upload do logo"
                    max="100"
                    value={images.logo.progress}
                    className="mt-3 w-full"
                  />
                )}
              </div>
            )}
          </div>

          <div className="surface-panel p-4">
            <label htmlFor="shop-banner" className="form-label">Banner</label>
            <input
              key={`banner-${imageInputResetKey}`}
              id="shop-banner"
              type="file"
              name="banner"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              className="mt-3 block w-full text-sm"
            />
            {images.banner.previewUrl && (
              <div className="mt-4">
                <img src={images.banner.previewUrl} alt="Pré-visualização do banner" className="aspect-video w-full rounded-lg object-cover" />
                {images.banner.progress > 0 && (
                  <progress
                    aria-label="Progresso do upload do banner"
                    max="100"
                    value={images.banner.progress}
                    className="mt-3 w-full"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
          {isSubmitting ? "A criar..." : "Criar loja"}
        </button>
      </form>
    </main>
  );
}
