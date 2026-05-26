import { Link } from "react-router-dom";
import { productImageAlt } from "../lib/imageAlt";

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(price));
}

function productImage(product) {
  return product.imageUrl || product.images?.[0]?.url || product.images?.[0]?.imageUrl || "";
}

export default function ProductCard({ product, ctaLabel = "Ver produto" }) {
  const imageUrl = productImage(product);

  return (
    <article className="group overflow-hidden rounded-lg border border-black/10 bg-white shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
      <Link to={`/products/${product.id}`} className="block no-underline">
        <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-subtle)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={productImageAlt(product.name)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--color-muted)]">
              Sem imagem
            </div>
          )}
          {product.brand && (
            <span className="badge absolute left-3 top-3 bg-white/92 text-[var(--color-primary-dark)] shadow-sm">
              Marca: {product.brand}
            </span>
          )}
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div>
          <h2 className="line-clamp-2 text-lg font-black leading-snug">
            <Link to={`/products/${product.id}`} className="hover:text-[var(--color-primary)]">
              {product.name}
            </Link>
          </h2>
          {product.materials && (
            <p className="mt-1 line-clamp-1 text-sm text-[var(--color-muted)]">
              Materiais: {product.materials}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {product.price !== undefined && product.price !== null && (
            <p className="text-lg font-black">{formatPrice(product.price)}</p>
          )}
          <Link to={`/products/${product.id}`} className="text-sm font-black text-[var(--color-primary)] hover:underline">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
