import { useState } from "react";
import { createReview } from "../services/reviewService";

function getErrorMessage(error, fallback) {
  if (error.response?.status === 409) {
    return "Já avaliou esta loja.";
  }

  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

export default function ReviewForm({ shopId }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (rating === 0 || isSubmitting || hasSubmitted) {
      return;
    }

    setSuccess("");
    setError("");
    setIsSubmitting(true);

    try {
      await createReview(shopId, {
        rating,
        comment: comment.trim() ? comment.trim() : null,
      });
      setSuccess("Avaliação enviada com sucesso.");
      setHasSubmitted(true);
      setComment("");
      setRating(0);
    } catch (submitError) {
      setError(
        getErrorMessage(submitError, "Não foi possível enviar a avaliação.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <h2 className="text-xl font-semibold">Avaliar esta loja</h2>

      {hasSubmitted ? (
        <p className="mt-4 text-green-600" role="status" aria-live="polite">
          {success}
        </p>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <p className="text-sm font-semibold">Classificação</p>
          <div className="mt-2 flex gap-2" aria-label="Classificação por estrelas">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`${star} estrela${star === 1 ? "" : "s"}`}
                aria-pressed={rating >= star}
                className="text-2xl text-yellow-500"
              >
                {rating >= star ? "★" : "☆"}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold">Comentário opcional</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded border border-gray-300 p-3"
          />
        </label>

        <button
          type="submit"
          disabled={rating === 0 || isSubmitting}
          className="rounded border border-black bg-black px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
        >
          {isSubmitting ? "A enviar..." : "Enviar avaliação"}
        </button>

        {error && (
          <p className="text-red-600" role="alert">
            {error}
          </p>
        )}
        </form>
      )}
    </section>
  );
}
