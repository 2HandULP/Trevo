import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { browseProducts, searchProducts } from "../services/productService";

const filterKeys = ["q", "minPrice", "maxPrice", "size", "color"];
const scopeKeys = ["shopId", "collectionId"];

function paramsToObject(searchParams) {
  return [...filterKeys, ...scopeKeys].reduce((params, key) => {
    const value = searchParams.get(key);

    if (value) {
      params[key] = value;
    }

    return params;
  }, {});
}

function getProductsFromResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return [];
}

export default function ProductSearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(() => ({
    q: searchParams.get("q") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    size: searchParams.get("size") || "",
    color: searchParams.get("color") || "",
  }));
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const requestParams = useMemo(() => paramsToObject(searchParams), [searchParams]);
  const isScopedBrowse = Boolean(requestParams.shopId || requestParams.collectionId);

  useEffect(() => {
    setForm({
      q: searchParams.get("q") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      size: searchParams.get("size") || "",
      color: searchParams.get("color") || "",
    });
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setIsLoading(true);
      setError("");

      try {
        const response = isScopedBrowse
          ? await browseProducts(requestParams)
          : await searchProducts(requestParams);

        if (active) {
          setProducts(getProductsFromResponse(response));
        }
      } catch (loadError) {
        if (active) {
          setProducts([]);
          setError(
            loadError.response?.data?.message ||
              loadError.response?.data?.detail ||
              "Nao foi possivel carregar os produtos"
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [isScopedBrowse, requestParams]);

  function handleChange(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams();

    scopeKeys.forEach((key) => {
      const value = searchParams.get(key);

      if (value) {
        nextParams.set(key, value);
      }
    });

    filterKeys.forEach((key) => {
      const value = form[key]?.trim();

      if (value) {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams);
  }

  return (
    <main className="page-shell">
      <div className="mb-8">
        <p className="text-sm font-black uppercase text-[var(--color-muted)]">Marketplace Trevo</p>
        <h1 className="mt-2 text-4xl font-black">Produtos</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="surface-panel h-fit p-5 md:sticky md:top-28">
          <h2 className="mb-4 text-xl font-black">Refinar pesquisa</h2>
          <form onSubmit={applyFilters} className="space-y-4">
            <div className="form-field">
              <label htmlFor="product-search" className="form-label">
                Pesquisa
              </label>
              <input
                id="product-search"
                name="q"
                type="search"
                value={form.q}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="min-price" className="form-label">
                Preco minimo
              </label>
              <input
                id="min-price"
                name="minPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.minPrice}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="max-price" className="form-label">
                Preco maximo
              </label>
              <input
                id="max-price"
                name="maxPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.maxPrice}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="size" className="form-label">
                Tamanho
              </label>
              <input
                id="size"
                name="size"
                type="text"
                value={form.size}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="color" className="form-label">
                Cor
              </label>
              <input
                id="color"
                name="color"
                type="text"
                value={form.color}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-primary w-full">
              Aplicar filtros
            </button>
          </form>
        </aside>

        <section>
          {isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-96 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="alert alert-error">
              {error}
            </p>
          )}

          {!isLoading && !error && products.length === 0 && (
            <div className="page-card p-8 text-center">
              <h2 className="text-2xl font-black">Nenhum produto encontrado.</h2>
              <p className="mt-3 text-[var(--color-muted)]">
                Experimenta ajustar os filtros para veres mais resultados.
              </p>
            </div>
          )}

          {!isLoading && !error && products.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
