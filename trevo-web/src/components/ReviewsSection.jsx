import { useEffect, useState } from "react";
import { getShopReviews } from "../services/reviewService";

const PAGE_SIZE = 5;

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function formatDate(value) {
  if (!value) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value));
}

function Stars({ rating }) {
  const roundedRating = Math.round(Number(rating || 0));

  return (
    <span aria-label={`${Number(rating || 0).toFixed(1)} estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true" className="text-yellow-500">
          {star <= roundedRating ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export default function ReviewsSection({ shopId }) {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReviews(nextPage = 0, mode = "replace") {
    setIsLoading(true);
    setError("");

    try {
      const response = await getShopReviews(shopId, {
        page: nextPage,
        size: PAGE_SIZE,
      });

      setReviews((currentReviews) =>
        mode === "append"
          ? [...currentReviews, ...(response.reviews || [])]
          : response.reviews || []
      );
      setAverageRating(response.averageRating ?? null);
      setTotalPages(response.totalPages || 0);
      setPage(response.page ?? nextPage);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar avaliacoes"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialReviews() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getShopReviews(shopId, {
          page: 0,
          size: PAGE_SIZE,
        });

        if (active) {
          setReviews(response.reviews || []);
          setAverageRating(response.averageRating ?? null);
          setTotalPages(response.totalPages || 0);
          setPage(response.page || 0);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, "Nao foi possivel carregar avaliacoes"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInitialReviews();

    return () => {
      active = false;
    };
  }, [shopId]);

  const hasMore = page < totalPages - 1;
  const isEmpty = !isLoading && !error && averageRating == null && reviews.length === 0;

  return (
    <section className="mt-8">
      <h2>Avaliacoes</h2>

      {averageRating != null && (
        <p>
          Media: <Stars rating={averageRating} /> {Number(averageRating).toFixed(1)}
        </p>
      )}

      {isLoading && (
        <p className="mt-3" aria-live="polite">
          A carregar avaliacoes...
        </p>
      )}
      {error && (
        <div className="mt-3">
          <p className="text-red-600" role="alert">
            {error}
          </p>
          {reviews.length === 0 && (
            <button
              type="button"
              onClick={() => loadReviews(0, "replace")}
              className="mt-2 border border-gray-300 px-3 py-2"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {isEmpty && <p>Sem avaliações</p>}

      {reviews.length > 0 && (
        <ul className="mt-4 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="border-t border-gray-200 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">{review.buyerName}</p>
                <Stars rating={review.rating} />
              </div>
              <p className="text-sm text-gray-600">{formatDate(review.createdAt)}</p>
              {review.comment && <p className="mt-2">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {hasMore && !error && (
        <button
          type="button"
          onClick={() => loadReviews(page + 1, "append")}
          disabled={isLoading}
          className="mt-4 border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Carregar mais
        </button>
      )}
    </section>
  );
}
