import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { normalizeRole, ROLES } from "../lib/roles";
import { getShopReviews, respondToReview } from "../services/reviewService";

const PAGE_SIZE = 5;

function getErrorMessage(error, fallback) {
  if (error.response?.status === 409) {
    return "Esta avaliação já tem resposta.";
  }

  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function formatDate(value) {
  if (!value) {
    return "Data indisponível";
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

function getResponseText(response) {
  if (!response) {
    return "";
  }

  return response.response || response.text || response.content || "";
}

export default function ReviewsSection({ shopId }) {
  const { isAuthenticated, role } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeResponseReviewId, setActiveResponseReviewId] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [responseError, setResponseError] = useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const canRespond =
    isAuthenticated && normalizeRole(role) === ROLES.SHOP_OWNER;

  const loadReviews = useCallback(
    async (nextPage = 0, mode = "replace", options = {}) => {
      const { isActive = () => true } = options;

      setIsLoading(true);
      setError("");

      try {
        const response = await getShopReviews(shopId, {
          page: nextPage,
          size: PAGE_SIZE,
        });

        if (isActive()) {
          setReviews((currentReviews) =>
            mode === "append"
              ? [...currentReviews, ...(response.reviews || [])]
              : response.reviews || []
          );
          setAverageRating(response.averageRating ?? null);
          setTotalPages(response.totalPages || 0);
          setPage(response.page ?? nextPage);
        }
      } catch (loadError) {
        if (isActive()) {
          setError(
            getErrorMessage(loadError, "Não foi possível carregar avaliações")
          );
        }
      } finally {
        if (isActive()) {
          setIsLoading(false);
        }
      }
    },
    [shopId]
  );

  useEffect(() => {
    let active = true;

    loadReviews(0, "replace", { isActive: () => active });

    return () => {
      active = false;
    };
  }, [loadReviews]);

  function openResponseForm(reviewId) {
    setActiveResponseReviewId(reviewId);
    setResponseText("");
    setResponseError("");
  }

  function closeResponseForm() {
    setActiveResponseReviewId(null);
    setResponseText("");
    setResponseError("");
  }

  async function handleResponseSubmit(event, reviewId) {
    event.preventDefault();

    const trimmedResponse = responseText.trim();
    if (!trimmedResponse) {
      return;
    }

    setIsSubmittingResponse(true);
    setResponseError("");

    try {
      const reviewResponse = await respondToReview(reviewId, trimmedResponse);

      setReviews((currentReviews) =>
        currentReviews.map((review) =>
          review.id === reviewId
            ? { ...review, response: reviewResponse }
            : review
        )
      );
      closeResponseForm();
    } catch (submitError) {
      setResponseError(
        getErrorMessage(submitError, "Não foi possível enviar a resposta")
      );
    } finally {
      setIsSubmittingResponse(false);
    }
  }

  const hasMore = page < totalPages - 1;
  const isEmpty =
    !isLoading && !error && averageRating == null && reviews.length === 0;

  return (
    <section className="mt-8">
      <h2>Avaliações</h2>

      {averageRating != null && (
        <p>
          Média: <Stars rating={averageRating} />{" "}
          {Number(averageRating).toFixed(1)}
        </p>
      )}

      {isLoading && (
        <p className="mt-3" aria-live="polite">
          A carregar avaliações...
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
              {review.response && (
                <div className="mt-3 border-l-2 border-gray-300 pl-3">
                  <p className="text-sm font-semibold">Resposta da loja</p>
                  <p className="mt-1">{getResponseText(review.response)}</p>
                </div>
              )}
              {canRespond && !review.response && (
                <div className="mt-3">
                  {activeResponseReviewId === review.id ? (
                    <form onSubmit={(event) => handleResponseSubmit(event, review.id)}>
                      <label className="sr-only" htmlFor={`review-response-${review.id}`}>
                        Resposta
                      </label>
                      <textarea
                        id={`review-response-${review.id}`}
                        value={responseText}
                        onInput={(event) => setResponseText(event.target.value)}
                        className="w-full border border-gray-300 p-2"
                        rows={3}
                      />
                      {responseError && (
                        <p className="mt-2 text-red-600" role="alert">
                          {responseError}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={!responseText.trim() || isSubmittingResponse}
                          className="border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Enviar resposta
                        </button>
                        <button
                          type="button"
                          onClick={closeResponseForm}
                          disabled={isSubmittingResponse}
                          className="border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openResponseForm(review.id)}
                      className="border border-gray-300 px-3 py-2"
                    >
                      Responder
                    </button>
                  )}
                </div>
              )}
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
