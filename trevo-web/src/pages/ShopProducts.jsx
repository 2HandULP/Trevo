import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { browseProducts } from "../services/productService";
import { getShopProfile } from "../services/shopService";

const sortOptions = [
  { value: "createdAt,desc", label: "Mais recentes" },
  { value: "name,asc", label: "Nome A-Z" },
  { value: "price,asc", label: "Preco crescente" },
  { value: "price,desc", label: "Preco decrescente" },
];

function sortCollections(collections) {
  return [...collections].sort((a, b) => a.displayOrder - b.displayOrder);
}

function productsFromResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return [];
}

export default function ShopProducts() {
  const { shopId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [shopError, setShopError] = useState("");
  const [productsError, setProductsError] = useState("");
  const [isShopLoading, setIsShopLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const collectionId = searchParams.get("collectionId") || "";
  const sort = searchParams.get("sort") || "createdAt,desc";
  const collections = useMemo(
    () => sortCollections(shop?.collections || []),
    [shop]
  );

  useEffect(() => {
    let active = true;

    async function loadShop() {
      try {
        const profile = await getShopProfile(shopId);

        if (active) {
          setShop(profile);
          setShopError("");
        }
      } catch (loadError) {
        if (active) {
          setShopError(
            loadError.response?.data?.message ||
              loadError.response?.data?.detail ||
              "Nao foi possivel carregar a loja"
          );
        }
      } finally {
        if (active) {
          setIsShopLoading(false);
        }
      }
    }

    loadShop();

    return () => {
      active = false;
    };
  }, [shopId]);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setIsProductsLoading(true);
      setProductsError("");

      try {
        const params = collectionId
          ? { collectionId, sort }
          : { shopId, sort };
        const response = await browseProducts(params);

        if (active) {
          setProducts(productsFromResponse(response));
        }
      } catch (loadError) {
        if (active) {
          setProducts([]);
          setProductsError(
            loadError.response?.data?.message ||
              loadError.response?.data?.detail ||
              "Nao foi possivel carregar os produtos"
          );
        }
      } finally {
        if (active) {
          setIsProductsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [collectionId, shopId, sort]);

  function updateParams(nextValues) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    });

    setSearchParams(nextParams);
  }

  function selectCollection(nextCollectionId) {
    updateParams({ collectionId: nextCollectionId });
  }

  function changeSort(event) {
    updateParams({ sort: event.target.value });
  }

  return (
    <main className="page-shell">
      {isShopLoading && (
        <div className="h-44 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />
      )}
      {shopError && (
        <p role="alert" className="alert alert-error">
          {shopError}
        </p>
      )}

      {!isShopLoading && !shopError && shop && (
        <>
          <div className="overflow-hidden rounded-lg bg-[linear-gradient(135deg,#0f5132,#17201b)] p-8 text-white shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-white/70">Produtos da loja</p>
              <h1 className="mt-2 text-4xl font-black">{shop.name}</h1>
              {shop.description && (
                <p className="mt-3 max-w-2xl leading-7 text-white/78">{shop.description}</p>
              )}
            </div>

            <label className="form-field min-w-56 text-sm font-bold text-white">
              Ordenar
              <select
                name="sort"
                value={sort}
                onChange={changeSort}
                className="form-input text-[var(--color-ink)]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Colecoes">
            <button
              type="button"
              onClick={() => selectCollection("")}
              className={`btn min-h-10 px-4 py-2 text-sm ${
                !collectionId ? "btn-primary" : "btn-secondary"
              }`}
            >
              Todos
            </button>
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => selectCollection(String(collection.id))}
                className={`btn min-h-10 px-4 py-2 text-sm ${
                  collectionId === String(collection.id)
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                {collection.name}
              </button>
            ))}
          </nav>

          <section className="mt-8">
            {isProductsLoading && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-96 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />
                ))}
              </div>
            )}
            {productsError && (
              <p role="alert" className="alert alert-error">
                {productsError}
              </p>
            )}

            {!isProductsLoading && !productsError && products.length === 0 && (
              <div className="page-card p-8 text-center">
                <h2 className="text-2xl font-black">Nenhum produto encontrado.</h2>
                <p className="mt-3 text-[var(--color-muted)]">
                  Esta colecao ainda nao tem produtos disponiveis.
                </p>
              </div>
            )}

            {!isProductsLoading && !productsError && products.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
