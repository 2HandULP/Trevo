import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { productImageAlt } from "../lib/imageAlt";
import { browseProducts, searchProducts } from "../services/productService";

const FILTER_KEYS = ["q", "minPrice", "maxPrice", "size", "color"];
const SCOPE_KEYS = ["shopId", "collectionId"];
const SEARCH_DEBOUNCE_MS = 300;

function readFilters(searchParams) {
  return Object.fromEntries(
    [...FILTER_KEYS, ...SCOPE_KEYS].map((key) => [key, searchParams.get(key) ?? ""])
  );
}

function hasSearchFilters(filters) {
  return FILTER_KEYS.some((key) => Boolean(filters[key]?.trim()));
}

function buildSearchParams(filters) {
  const next = new URLSearchParams();

  [...FILTER_KEYS, ...SCOPE_KEYS].forEach((key) => {
    const value = filters[key]?.trim();

    if (value) {
      next.set(key, value);
    }
  });

  return next;
}

function productItems(page) {
  return page?.content || page?.products || [];
}

function pageNumber(page) {
  return page?.number ?? 0;
}

function totalPages(page) {
  return page?.totalPages ?? 0;
}

function productImage(product) {
  return product.imageUrl || product.images?.[0]?.url || product.images?.[0]?.imageUrl || "";
}

export default function ProductSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilters = useMemo(() => readFilters(searchParams), [searchParams]);
  const pageParam = searchParams.get("page") ?? "";
  const [filters, setFilters] = useState(urlFilters);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFilters(urlFilters);
  }, [searchParams, urlFilters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const current = buildSearchParams(urlFilters).toString();
      const nextParams = buildSearchParams(filters);
      nextParams.delete("page");
      const next = nextParams.toString();

      if (current !== next) {
        setSearchParams(next, { replace: true });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters, setSearchParams, urlFilters]);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setIsLoading(true);
      setError("");

      try {
        const params = {
          ...urlFilters,
          page: pageParam,
        };
        const scopedBrowse = !hasSearchFilters(urlFilters) && (urlFilters.shopId || urlFilters.collectionId);
        const page = scopedBrowse ? await browseProducts(params) : await searchProducts(params);

        if (active) {
          setResults(page);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError.response?.data?.message ||
              loadError.response?.data?.detail ||
              "Não foi possível carregar produtos"
          );
          setResults(null);
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
  }, [pageParam, urlFilters]);

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updatePage(nextPage) {
    const next = new URLSearchParams(searchParams);

    if (nextPage > 0) {
      next.set("page", String(nextPage));
    } else {
      next.delete("page");
    }

    setSearchParams(next, { replace: false });
  }

  const products = productItems(results);
  const currentPage = pageNumber(results);
  const pageCount = totalPages(results);
  const hasPreviousPage = currentPage > 0;
  const hasNextPage = pageCount > 0 && currentPage + 1 < pageCount;

  return (
    <main className="mx-auto my-10 grid max-w-6xl gap-6 text-black lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4 border border-gray-200 p-4">
        <h1 className="text-2xl font-semibold">Produtos</h1>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Pesquisar</span>
          <input
            aria-label="Pesquisar produtos"
            name="q"
            value={filters.q}
            onChange={(event) => updateFilter("q", event.target.value)}
            className="w-full border border-gray-300 px-3 py-2"
            placeholder="Vestido, casaco, marca..."
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Preço mínimo</span>
          <input
            aria-label="Preço mínimo"
            name="minPrice"
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={(event) => updateFilter("minPrice", event.target.value)}
            className="w-full border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Preço máximo</span>
          <input
            aria-label="Preço máximo"
            name="maxPrice"
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={(event) => updateFilter("maxPrice", event.target.value)}
            className="w-full border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tamanho</span>
          <input
            aria-label="Tamanho"
            name="size"
            value={filters.size}
            onChange={(event) => updateFilter("size", event.target.value)}
            className="w-full border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Cor</span>
          <input
            aria-label="Cor"
            name="color"
            value={filters.color}
            onChange={(event) => updateFilter("color", event.target.value)}
            className="w-full border border-gray-300 px-3 py-2"
          />
        </label>
      </aside>

      <section>
        {isLoading && <p aria-live="polite">A carregar produtos...</p>}
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}

        {!isLoading && !error && products.length === 0 && <p>Sem produtos encontrados.</p>}

        {!error && products.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const imageUrl = productImage(product);

              return (
                <article key={product.id} className="border border-gray-200 p-4">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={productImageAlt(product.name)}
                      className="mb-3 aspect-square w-full object-cover"
                    />
                  )}
                  <h2 className="font-semibold">{product.name}</h2>
                  {product.brand && <p>{product.brand}</p>}
                  <p>{Number(product.price).toFixed(2)} EUR</p>
                  <Link to={`/products/${product.id}`}>Ver produto</Link>
                </article>
              );
            })}
          </div>
        )}

        {!error && pageCount > 1 && (
          <nav aria-label="Paginação de produtos" className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => updatePage(currentPage - 1)}
              disabled={!hasPreviousPage || isLoading}
              className="border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span>
              Página {currentPage + 1} de {pageCount}
            </span>
            <button
              type="button"
              onClick={() => updatePage(currentPage + 1)}
              disabled={!hasNextPage || isLoading}
              className="border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Seguinte
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
