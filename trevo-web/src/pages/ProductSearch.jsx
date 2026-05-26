import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
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

export default function ProductSearch() {
  const { t } = useTranslation("browse");
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
              t("loadProductsFailed")
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
  }, [pageParam, t, urlFilters]);

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
    <main className="page-shell">
      <section className="mb-8 overflow-hidden rounded-lg bg-[linear-gradient(135deg,#0f5132,#17201b)] p-8 text-white shadow-[var(--shadow-soft)]">
        <p className="text-sm font-black uppercase text-white/70">{t("marketplaceEyebrow")}</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(280px,0.25fr)] lg:items-end">
          <div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-5xl">
              {t("marketplaceTitle")}
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/78">
              {t("marketplaceDescription")}
            </p>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="text-3xl font-black">{products.length}</p>
            <p className="text-sm font-bold text-white/70">{t("featuredSelection")}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="surface-panel h-fit space-y-4 p-5 lg:sticky lg:top-28">
        <h2 className="text-xl font-black">{t("filters")}</h2>

        <label className="form-field">
          <span className="form-label">{t("search")}</span>
          <input
            aria-label={t("search")}
            name="q"
            value={filters.q}
            onChange={(event) => updateFilter("q", event.target.value)}
            className="form-input"
            placeholder={t("searchPlaceholder")}
          />
        </label>

        <label className="form-field">
          <span className="form-label">{t("minPrice")}</span>
          <input
            aria-label={t("minPrice")}
            name="minPrice"
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={(event) => updateFilter("minPrice", event.target.value)}
            className="form-input"
          />
        </label>

        <label className="form-field">
          <span className="form-label">{t("maxPrice")}</span>
          <input
            aria-label={t("maxPrice")}
            name="maxPrice"
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={(event) => updateFilter("maxPrice", event.target.value)}
            className="form-input"
          />
        </label>

        <label className="form-field">
          <span className="form-label">{t("size")}</span>
          <input
            aria-label={t("size")}
            name="size"
            value={filters.size}
            onChange={(event) => updateFilter("size", event.target.value)}
            className="form-input"
          />
        </label>

        <label className="form-field">
          <span className="form-label">{t("color")}</span>
          <input
            aria-label={t("color")}
            name="color"
            value={filters.color}
            onChange={(event) => updateFilter("color", event.target.value)}
            className="form-input"
          />
        </label>
      </aside>

      <section>
        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
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
            <h2 className="text-2xl font-black">{t("emptyProductsTitle")}</h2>
            <p className="mt-3 text-[var(--color-muted)]">{t("emptyProductsText")}</p>
          </div>
        )}

        {!error && products.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} ctaLabel={t("viewProduct")} />
            ))}
          </div>
        )}

        {!error && pageCount > 1 && (
          <nav aria-label={t("productPagination")} className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => updatePage(currentPage - 1)}
              disabled={!hasPreviousPage || isLoading}
              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("previous", { ns: "common" })}
            </button>
            <span className="badge">
              {t("pageOf", { page: currentPage + 1, total: pageCount })}
            </span>
            <button
              type="button"
              onClick={() => updatePage(currentPage + 1)}
              disabled={!hasNextPage || isLoading}
              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("next", { ns: "common" })}
            </button>
          </nav>
        )}
      </section>
      </div>
    </main>
  );
}
