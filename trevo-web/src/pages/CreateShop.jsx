import { useState } from "react";
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

        <div>
          <label htmlFor="shop-logo">Logo</label>
          <input
            key={`logo-${imageInputResetKey}`}
            id="shop-logo"
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageChange}
          />
          {images.logo.previewUrl && (
            <div>
              <img src={images.logo.previewUrl} alt="Pré-visualização do logo" />
              {images.logo.progress > 0 && (
                <progress
                  aria-label="Progresso do upload do logo"
                  max="100"
                  value={images.logo.progress}
                />
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="shop-banner">Banner</label>
          <input
            key={`banner-${imageInputResetKey}`}
            id="shop-banner"
            type="file"
            name="banner"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageChange}
          />
          {images.banner.previewUrl && (
            <div>
              <img src={images.banner.previewUrl} alt="Pré-visualização do banner" />
              {images.banner.progress > 0 && (
                <progress
                  aria-label="Progresso do upload do banner"
                  max="100"
                  value={images.banner.progress}
                />
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "A criar..." : "Criar loja"}
        </button>
      </form>
    </div>
  );
}
