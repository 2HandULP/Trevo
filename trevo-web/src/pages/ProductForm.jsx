import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import { getShopDashboard, getShopProfile } from "../services/shopService";
import {
  assignProductCollections,
  createProduct,
  createProductVariant,
  deleteProductVariant,
  getProduct,
  updateProduct,
  updateProductVariant,
} from "../services/productService";

const initialForm = {
  name: "",
  description: "",
  price: "",
  brand: "",
  materials: "",
};

const emptyVariant = {
  size: "",
  color: "",
  stock: "",
};

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function sortCollections(collections) {
  return [...collections].sort((a, b) => a.displayOrder - b.displayOrder);
}

function isVariantFilled(variant) {
  return Boolean(variant.size.trim() || variant.color.trim() || variant.stock !== "");
}

function toVariantPayload(variant) {
  return {
    size: variant.size.trim(),
    color: variant.color.trim(),
    stock: Number(variant.stock),
  };
}

function toProductPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: form.price,
    brand: form.brand.trim(),
    materials: form.materials.trim(),
  };
}

export default function ProductForm({ mode }) {
  const { productId } = useParams();
  const isEditMode = mode === "edit";
  const [form, setForm] = useState(initialForm);
  const [variants, setVariants] = useState([{ ...emptyVariant }]);
  const [removedVariantIds, setRemovedVariantIds] = useState([]);
  const [images, setImages] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCollections(shopId) {
      if (!shopId) {
        return;
      }

      try {
        const profile = await getShopProfile(shopId);

        if (active) {
          setCollections(sortCollections(profile.collections || []));
        }
      } catch {
        if (active) {
          setCollections([]);
        }
      }
    }

    async function loadInitialData() {
      try {
        if (isEditMode) {
          const product = await getProduct(productId);

          if (active) {
            setForm({
              name: product.name || "",
              description: product.description || "",
              price: product.price == null ? "" : String(product.price),
              brand: product.brand || "",
              materials: product.materials || "",
            });
            setVariants(
              product.variants?.length
                ? product.variants.map((variant) => ({
                    id: variant.id,
                    size: variant.size || "",
                    color: variant.color || "",
                    stock: variant.stock == null ? "" : String(variant.stock),
                  }))
                : [{ ...emptyVariant }]
            );
          }

          await loadCollections(product.shopId);
          return;
        }

        const dashboard = await getShopDashboard();
        await loadCollections(dashboard?.shop?.id);
      } catch (loadError) {
        if (active && isEditMode) {
          setError(
            getErrorMessage(loadError, "Não foi possível carregar o produto")
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [isEditMode, productId]);

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [images]);

  function handleChange(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
  }

  function handleVariantChange(index, field, value) {
    setVariants((currentVariants) =>
      currentVariants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      )
    );
  }

  function addVariant() {
    setVariants((currentVariants) => [...currentVariants, { ...emptyVariant }]);
  }

  function removeVariant(index) {
    setVariants((currentVariants) => {
      const variant = currentVariants[index];

      if (variant?.id) {
        setRemovedVariantIds((currentIds) => [...currentIds, variant.id]);
      }

      const nextVariants = currentVariants.filter((_, variantIndex) => variantIndex !== index);
      return nextVariants.length ? nextVariants : [{ ...emptyVariant }];
    });
  }

  function handleImagesChange(event) {
    const selectedFiles = [...event.target.files];
    setError("");

    setImages((currentImages) => {
      const nextFiles = [...currentImages.map((image) => image.file), ...selectedFiles];
      const cappedFiles = nextFiles.slice(0, 8);

      currentImages.forEach((image) => URL.revokeObjectURL(image.url));

      return cappedFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));
    });

    if (images.length + selectedFiles.length > 8) {
      setError("Só podes adicionar até 8 imagens.");
    }
  }

  function toggleCollection(collectionId) {
    setSelectedCollectionIds((currentIds) =>
      currentIds.includes(collectionId)
        ? currentIds.filter((id) => id !== collectionId)
        : [...currentIds, collectionId]
    );
  }

  function validateVariants() {
    return variants.every((variant) => {
      if (!isVariantFilled(variant)) {
        return true;
      }

      const stock = Number(variant.stock);
      return Number.isFinite(stock) && stock >= 0;
    });
  }

  async function submitVariants(nextProductId) {
    for (const variant of variants.filter(isVariantFilled)) {
      const payload = toVariantPayload(variant);

      if (variant.id) {
        await updateProductVariant(nextProductId, variant.id, payload);
      } else {
        await createProductVariant(nextProductId, payload);
      }
    }

    for (const variantId of removedVariantIds) {
      await deleteProductVariant(nextProductId, variantId);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.price) {
      setError("Preenche nome e preço");
      return;
    }

    if (!validateVariants()) {
      setError("O stock deve ser um número igual ou superior a 0");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = toProductPayload(form);
      const savedProduct = isEditMode
        ? await updateProduct(productId, payload)
        : await createProduct(payload);
      const nextProductId = savedProduct.id || productId;

      await submitVariants(nextProductId);
      await assignProductCollections(nextProductId, selectedCollectionIds);

      setRemovedVariantIds([]);
      setSuccess(
        isEditMode
          ? "Produto atualizado com sucesso"
          : "Produto criado com sucesso"
      );
    } catch (submitError) {
      setError(
        getErrorMessage(
          submitError,
          isEditMode
            ? "Não foi possível atualizar o produto"
            : "Não foi possível criar o produto"
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow="Catalogo"
        title={isEditMode ? "Editar produto" : "Criar produto"}
        description="Define os detalhes comerciais, variantes, imagens e colecoes do produto."
      />

      {isLoading && <div className="h-96 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {success && <p className="alert alert-success" aria-live="polite">{success}</p>}

      {!isLoading && (
        <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
          <section className="page-card space-y-4 p-6">
            <h2 className="text-2xl font-black">Detalhes</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label htmlFor="product-name" className="form-field">
                <span className="form-label">Nome</span>
                <input
                  id="product-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="form-input"
                />
              </label>
              <label htmlFor="product-description" className="form-field md:col-span-2">
                <span className="form-label">Descrição</span>
                <textarea
                  id="product-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="form-input min-h-32"
                />
              </label>
              <label htmlFor="product-price" className="form-field">
                <span className="form-label">Preço</span>
                <input
                  id="product-price"
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  className="form-input"
                />
              </label>
              <label htmlFor="product-brand" className="form-field">
                <span className="form-label">Marca</span>
                <input
                  id="product-brand"
                  type="text"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  className="form-input"
                />
              </label>
              <label htmlFor="product-materials" className="form-field md:col-span-2">
                <span className="form-label">Materiais</span>
                <input
                  id="product-materials"
                  type="text"
                  name="materials"
                  value={form.materials}
                  onChange={handleChange}
                  className="form-input"
                />
              </label>
            </div>
          </section>

          <section className="page-card space-y-4 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-black">Variantes</h2>
              <button type="button" onClick={addVariant} className="btn btn-secondary">
                Adicionar variante
              </button>
            </div>
            {variants.map((variant, index) => (
              <div key={variant.id || index} className="grid gap-3 rounded-lg border border-black/10 bg-[var(--color-surface-raised)] p-4 md:grid-cols-4">
                <input
                  type="text"
                  name={`variant-size-${index}`}
                  placeholder="Tamanho"
                  value={variant.size}
                  onChange={(event) => handleVariantChange(index, "size", event.target.value)}
                  className="form-input"
                />
                <input
                  type="text"
                  name={`variant-color-${index}`}
                  placeholder="Cor"
                  value={variant.color}
                  onChange={(event) => handleVariantChange(index, "color", event.target.value)}
                  className="form-input"
                />
                <input
                  type="number"
                  name={`variant-stock-${index}`}
                  placeholder="Stock"
                  min="0"
                  value={variant.stock}
                  onChange={(event) => handleVariantChange(index, "stock", event.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="btn min-h-11 border border-red-200 bg-red-50 px-3 py-2 text-red-700"
                >
                  Remover
                </button>
              </div>
            ))}
          </section>

          <section className="page-card space-y-4 p-6">
            <h2 className="text-2xl font-black">Imagens</h2>
            {/* TODO: ligar upload de imagens ao backend/Cloudinary quando o contrato de PROD/SHOP-F05 estiver disponível. */}
            <input
              type="file"
              name="images"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className="form-input"
            />
            {images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {images.map((image, index) => (
                  <li key={image.url}>
                    <img
                      src={image.url}
                      alt={`Pré-visualização ${index + 1}`}
                      className="h-32 w-full rounded-lg object-cover shadow-[var(--shadow-card)]"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="page-card space-y-4 p-6">
            <h2 className="text-2xl font-black">Coleções</h2>
            {collections.length === 0 ? (
              <p className="text-[var(--color-muted)]">Sem coleções disponíveis.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {collections.map((collection) => (
                  <label key={collection.id} className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-4 font-bold shadow-[var(--shadow-card)]">
                    <input
                      type="checkbox"
                      name="collectionIds"
                      value={collection.id}
                      checked={selectedCollectionIds.includes(collection.id)}
                      onChange={() => toggleCollection(collection.id)}
                    />
                    <span>{collection.name}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? "A guardar..." : "Guardar produto"}
          </button>
        </form>
      )}
    </main>
  );
}
