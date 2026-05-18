import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
    <main className="mx-auto my-10 max-w-6xl px-4 text-black">
      {isShopLoading && <p aria-live="polite">A carregar loja...</p>}
      {shopError && (
        <p role="alert" className="text-red-600">
          {shopError}
        </p>
      )}

      {!isShopLoading && !shopError && shop && (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase text-gray-500">Produtos da loja</p>
              <h1 className="text-3xl font-bold">{shop.name}</h1>
            </div>

            <label className="text-sm font-medium">
              Ordenar
              <select
                name="sort"
                value={sort}
                onChange={changeSort}
                className="mt-1 block rounded border border-gray-300 px-3 py-2"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Colecoes">
            <button
              type="button"
              onClick={() => selectCollection("")}
              className={`rounded border px-4 py-2 text-sm ${
                !collectionId ? "border-black bg-black text-white" : "border-gray-300"
              }`}
            >
              Todos
            </button>
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => selectCollection(String(collection.id))}
                className={`rounded border px-4 py-2 text-sm ${
                  collectionId === String(collection.id)
                    ? "border-black bg-black text-white"
                    : "border-gray-300"
                }`}
              >
                {collection.name}
              </button>
            ))}
          </nav>

          <section className="mt-8">
            {isProductsLoading && <p aria-live="polite">A carregar produtos...</p>}
            {productsError && (
              <p role="alert" className="text-red-600">
                {productsError}
              </p>
            )}

            {!isProductsLoading && !productsError && products.length === 0 && (
              <p>Nenhum produto encontrado.</p>
            )}

            {!isProductsLoading && !productsError && products.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
