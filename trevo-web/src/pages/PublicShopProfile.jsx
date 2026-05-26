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
    <main className="page-shell">
      {isLoading && (
        <div className="h-72 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />
      )}
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}

      {!isLoading && !error && shop && (
        <>
          <section className="overflow-hidden rounded-lg bg-white shadow-[var(--shadow-soft)]">
            <div className="relative min-h-64 bg-[linear-gradient(135deg,#0f5132,#17201b)]">
              {shop.bannerUrl && (
                <img
                  src={shop.bannerUrl}
                  alt={t("shopBannerAlt", { name: shop.name || t("anonymousShop") })}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative flex min-h-64 items-end p-6 text-white sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                  {shop.logoUrl && (
                    <img
                      src={shop.logoUrl}
                      alt={t("shopLogoAlt", { name: shop.name || t("anonymousShop") })}
                      className="h-24 w-24 rounded-lg border-4 border-white object-cover shadow-xl"
                    />
                  )}
                  <div>
                    <span className="badge bg-white/90 text-[var(--color-primary-dark)]">
                      {formatRating(shop.averageRating, t)}
                    </span>
                    <h1 className="mt-3 text-4xl font-black">{shop.name}</h1>
                    {shop.description && (
                      <p className="mt-3 max-w-2xl leading-7 text-white/82">{shop.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-8">
              <section className="page-card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-[var(--color-muted)]">
                      {t("collections")}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {t("shopCollectionsDescription")}
                    </h2>
                  </div>
                  <Link to={`/shops/${shopId}/products`} className="btn btn-primary">
                    {t("viewAllProducts")}
                  </Link>
                </div>

                {shop.collections.length === 0 ? (
                  <p className="mt-6 text-[var(--color-muted)]">{t("noCollections")}</p>
                ) : (
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {shop.collections.map((collection) => (
                      <li key={collection.id}>
                        <Link
                          className="group flex items-center justify-between rounded-lg border border-black/10 bg-[var(--color-surface-raised)] p-4 font-black transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card)]"
                          to={`/shops/${shopId}/products?collectionId=${collection.id}`}
                        >
                          <span>{collection.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <ReviewsSection shopId={shopId} />
            </div>

            <aside className="surface-panel h-fit p-5">
              <p className="text-sm font-black uppercase text-[var(--color-muted)]">
                {t("shopRating", { rating: shop.averageRating == null ? "0.0" : Number(shop.averageRating).toFixed(1) })}
              </p>
              <h2 className="mt-2 text-2xl font-black">{shop.name}</h2>
              <p className="mt-3 leading-7 text-[var(--color-muted)]">
                {shop.description || t("anonymousShop")}
              </p>
              <Link to={`/shops/${shopId}/products`} className="btn btn-secondary mt-6 w-full">
                {t("viewAllProducts")}
              </Link>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
