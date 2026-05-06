import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getShopProfile } from "../services/shopService";

function sortCollections(collections) {
  return [...collections].sort((a, b) => a.displayOrder - b.displayOrder);
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
          setError(loadError.message || "Nao foi possivel carregar a loja");
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
    <div style={{ maxWidth: "48rem", margin: "4rem auto", padding: "2rem", color: "black" }}>
      {isLoading && <p>A carregar loja...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!isLoading && !error && shop && (
        <>
          {shop.bannerUrl && (
            <img
              src={shop.bannerUrl}
              alt={`Banner da loja ${shop.name}`}
              style={{ display: "block", width: "100%", maxHeight: "16rem", objectFit: "cover" }}
            />
          )}

          {shop.logoUrl && (
            <img
              src={shop.logoUrl}
              alt={`Logo da loja ${shop.name}`}
              style={{ display: "block", width: "6rem", height: "6rem", objectFit: "cover" }}
            />
          )}

          <h1>{shop.name}</h1>
          <p>{shop.description}</p>
          <p>{shop.averageRating == null ? "Sem avaliações" : `Rating: ${shop.averageRating}`}</p>

          <p>
            <Link to={`/products?shopId=${shopId}`}>Ver todos os produtos</Link>
          </p>

          <section>
            <h2>Colecoes</h2>
            <ul>
              {shop.collections.map((collection) => (
                <li key={collection.id}>
                  <Link to={`/products?collectionId=${collection.id}`}>
                    {collection.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
