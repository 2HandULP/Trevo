import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import ReviewsSection from "../components/ReviewsSection";

import { getShopProfile } from "../services/shopService";

function sortCollections(collections) {
  return [...collections].sort((a, b) => a.displayOrder - b.displayOrder);
}

function formatRating(averageRating, t) {
  if (averageRating == null) {
    return t("noReviews");
  }

  return t("shopRating", { rating: Number(averageRating).toFixed(1) });
}

export default function PublicShopProfile() {
  const { t } = useTranslation("browse");
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
              t("loadShopFailed")
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
  }, [shopId, t]);

  return (
    <div className="mx-auto my-16 max-w-3xl p-8 text-black">
      {isLoading && <p aria-live="polite">{t("loadingShop")}</p>}
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
              alt={t("shopBannerAlt", { name: shop.name || t("anonymousShop") })}
              className="block max-h-64 w-full object-cover"
            />
          )}

          {shop.logoUrl && (
            <img
              src={shop.logoUrl}
              alt={t("shopLogoAlt", { name: shop.name || t("anonymousShop") })}
              className="mt-4 block h-24 w-24 object-cover"
            />
          )}

          <h1>{shop.name}</h1>
          <p>{shop.description}</p>
          <p>{formatRating(shop.averageRating, t)}</p>

          <p>
            <Link to={`/shops/${shopId}/products`}>{t("viewAllProducts")}</Link>
          </p>

          <ReviewsSection shopId={shopId} />

          <section>
            <h2>{t("collections")}</h2>
            {shop.collections.length === 0 ? (
              <p>{t("noCollections")}</p>
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
