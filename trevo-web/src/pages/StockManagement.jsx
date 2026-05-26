import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import {
  bulkUpdateVariantStock,
  getProduct,
} from "../services/productService";

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function stockFromValue(value) {
  const stock = Number(value);
  return Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0;
}

export default function StockManagement() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [stocks, setStocks] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        const loadedProduct = await getProduct(productId);

        if (active) {
          setProduct(loadedProduct);
          setStocks(
            (loadedProduct.variants || []).reduce((nextStocks, variant) => {
              nextStocks[variant.id] = String(variant.stock ?? 0);
              return nextStocks;
            }, {})
          );
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, "Nao foi possivel carregar o produto"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [productId]);

  function handleStockChange(variantId, value) {
    setSuccess("");
    setStocks((currentStocks) => ({
      ...currentStocks,
      [variantId]: String(stockFromValue(value)),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const updates = (product?.variants || []).map((variant) => ({
      variantId: variant.id,
      stock: stockFromValue(stocks[variant.id]),
    }));

    try {
      setIsSaving(true);
      const updatedVariants = await bulkUpdateVariantStock(productId, updates);
      setProduct((currentProduct) => ({
        ...currentProduct,
        variants: updatedVariants,
      }));
      setStocks(
        updatedVariants.reduce((nextStocks, variant) => {
          nextStocks[variant.id] = String(variant.stock ?? 0);
          return nextStocks;
        }, {})
      );
      setSuccess("Stock atualizado com sucesso");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Nao foi possivel atualizar o stock"));
    } finally {
      setIsSaving(false);
    }
  }

  const variants = product?.variants || [];

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow="Inventario"
        title="Gestao de stock"
        description={product?.name || "Atualiza as quantidades disponiveis por variante."}
      />

      {isLoading && <div className="h-80 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" aria-live="polite" />}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="alert alert-success" role="status" aria-live="polite">
          {success}
        </p>
      )}

      {!isLoading && product && (
        <section className="page-card p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-black">{product.name}</h2>
            <span className="badge">{variants.length} variantes</span>
          </div>
          {variants.length === 0 ? (
            <div className="surface-panel p-6 text-center text-[var(--color-muted)]">
              Este produto ainda nao tem variantes.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-black/10 bg-[var(--color-surface-raised)]">
                      <th className="px-4 py-3 text-sm font-black uppercase text-[var(--color-muted)]">Tamanho</th>
                      <th className="px-4 py-3 text-sm font-black uppercase text-[var(--color-muted)]">Cor</th>
                      <th className="px-4 py-3 text-sm font-black uppercase text-[var(--color-muted)]">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant) => (
                      <tr key={variant.id} className="border-b border-black/5">
                        <td className="px-4 py-3 font-bold">
                          {variant.size}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-muted)]">
                          {variant.color}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            name={`stock-${variant.id}`}
                            aria-label={`Stock ${variant.size} ${variant.color}`}
                            min="0"
                            value={stocks[variant.id] ?? "0"}
                            onChange={(event) =>
                              handleStockChange(variant.id, event.target.value)
                            }
                            className="form-input w-28"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary mt-6 disabled:opacity-50"
              >
                {isSaving ? "A guardar..." : "Guardar alteracoes"}
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
