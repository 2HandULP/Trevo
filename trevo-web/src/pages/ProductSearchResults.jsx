import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(price));
}

function ProductCard({ product }) {
  return (
    <article className="rounded border border-gray-200 bg-white p-4">
      <div className="flex aspect-square items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
        Sem imagem
      </div>
      <div className="mt-4 space-y-2">
        <h2 className="text-lg font-semibold">
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h2>
        {product.price !== undefined && product.price !== null && (
          <p className="font-medium">{formatPrice(product.price)}</p>
        )}
        {product.brand && <p className="text-sm text-gray-600">Marca: {product.brand}</p>}
        {product.materials && (
          <p className="text-sm text-gray-600">Materiais: {product.materials}</p>
        )}
      </div>
    </article>
  );
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
    <main className="mx-auto my-10 max-w-6xl px-4 text-black">
      <h1 className="text-3xl font-bold">Produtos</h1>

      <div className="mt-6 grid gap-8 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded border border-gray-200 p-4">
          <form onSubmit={applyFilters} className="space-y-4">
            <div>
              <label htmlFor="product-search" className="block text-sm font-medium">
                Pesquisa
              </label>
              <input
                id="product-search"
                name="q"
                type="search"
                value={form.q}
                onChange={handleChange}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="min-price" className="block text-sm font-medium">
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
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="max-price" className="block text-sm font-medium">
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
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium">
                Tamanho
              </label>
              <input
                id="size"
                name="size"
                type="text"
                value={form.size}
                onChange={handleChange}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium">
                Cor
              </label>
              <input
                id="color"
                name="color"
                type="text"
                value={form.color}
                onChange={handleChange}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <button type="submit" className="w-full rounded bg-black px-4 py-2 text-white">
              Aplicar filtros
            </button>
          </form>
        </aside>

        <section>
          {isLoading && <p aria-live="polite">A carregar produtos...</p>}
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}

          {!isLoading && !error && products.length === 0 && (
            <p>Nenhum produto encontrado.</p>
          )}

          {!isLoading && !error && products.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
