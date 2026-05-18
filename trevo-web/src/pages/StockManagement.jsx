import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
    <div className="mx-auto my-16 max-w-4xl p-8 text-black">
      <h1 className="text-3xl font-bold">Gestao de stock</h1>

      {isLoading && <p className="mt-4" aria-live="polite">A carregar produto...</p>}
      {error && (
        <p className="mt-4 text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 text-green-600" role="status" aria-live="polite">
          {success}
        </p>
      )}

      {!isLoading && product && (
        <>
          <h2 className="mt-6 text-xl font-semibold">{product.name}</h2>

          {variants.length === 0 ? (
            <p className="mt-4">Este produto ainda nao tem variantes.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3">Tamanho</th>
                      <th className="border border-gray-200 px-4 py-3">Cor</th>
                      <th className="border border-gray-200 px-4 py-3">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant) => (
                      <tr key={variant.id}>
                        <td className="border border-gray-200 px-4 py-3">
                          {variant.size}
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          {variant.color}
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          <input
                            type="number"
                            name={`stock-${variant.id}`}
                            aria-label={`Stock ${variant.size} ${variant.color}`}
                            min="0"
                            value={stocks[variant.id] ?? "0"}
                            onChange={(event) =>
                              handleStockChange(variant.id, event.target.value)
                            }
                            className="w-28 rounded border border-gray-300 px-3 py-2"
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
                className="mt-6 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {isSaving ? "A guardar..." : "Guardar alteracoes"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
