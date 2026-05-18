import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getShopProfile } from "../services/shopService";

function sortCollections(collections) {
  return [...collections].sort((a, b) => a.displayOrder - b.displayOrder);
}

function formatRating(averageRating) {
  if (averageRating == null) {
    return "Sem avaliações";
  }

  return `Avaliação: ${Number(averageRating).toFixed(1)}`;
}

export default function PublicShopProfile() {
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadShopProfile() {
      try {
        const profile = await getShopProfile(shopId);

        if (active) {
          setShop({
            ...profile,
            collections: sortCollections(profile.collections || []),
          });
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError.response?.data?.message ||
              loadError.response?.data?.detail ||
              "Não foi possível carregar a loja"
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadShopProfile();

    return () => {
      active = false;
    };
  }, [shopId]);

  return (
    <div className="mx-auto my-16 max-w-3xl p-8 text-black">
      {isLoading && <p aria-live="polite">A carregar loja...</p>}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      {!isLoading && !error && shop && (
        <>
          {shop.bannerUrl && (
            <img
              src={shop.bannerUrl}
              alt={`Banner da loja ${shop.name}`}
              className="block max-h-64 w-full object-cover"
            />
          )}

          {shop.logoUrl && (
            <img
              src={shop.logoUrl}
              alt={`Logo da loja ${shop.name}`}
              className="mt-4 block h-24 w-24 object-cover"
            />
          )}

          <h1>{shop.name}</h1>
          <p>{shop.description}</p>
          <p>{formatRating(shop.averageRating)}</p>

          <p>
            <Link to={`/shops/${shopId}/products`}>Ver todos os produtos</Link>
          </p>

          <section>
            <h2>Coleções</h2>
            {shop.collections.length === 0 ? (
              <p>Sem coleções.</p>
            ) : (
              <ul>
                {shop.collections.map((collection) => (
                  <li key={collection.id}>
                    <Link to={`/shops/${shopId}/products?collectionId=${collection.id}`}>
                      {collection.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
