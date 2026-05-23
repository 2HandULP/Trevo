import { useEffect, useState } from "react";
import {
  getCart,
  removeCartItem,
  updateCartItem,
} from "../services/cartService";

function formatPrice(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function productImageAlt(productName) {
  const name = productName?.trim();

  return name ? `Imagem do produto ${name}` : "Imagem do produto sem nome";
}

export default function Cart() {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVariantId, setPendingVariantId] = useState(null);

  async function loadCart() {
    const loadedCart = await getCart();
    setCart(loadedCart);
    setError("");
  }

  useEffect(() => {
    let active = true;

    async function loadInitialCart() {
      try {
        const loadedCart = await getCart();

        if (active) {
          setCart(loadedCart);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, "Nao foi possivel carregar o carrinho"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInitialCart();

    return () => {
      active = false;
    };
  }, []);

  async function handleQuantityChange(item, nextQuantity) {
    if (nextQuantity < 1) {
      return;
    }

    try {
      setPendingVariantId(item.variantId);
      const updatedCart = await updateCartItem(item.variantId, nextQuantity);
      setCart(updatedCart);
      setError("");
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Nao foi possivel atualizar o carrinho"));
    } finally {
      setPendingVariantId(null);
    }
  }

  async function handleRemove(item) {
    try {
      setPendingVariantId(item.variantId);
      await removeCartItem(item.variantId);
      await loadCart();
    } catch (removeError) {
      setError(getErrorMessage(removeError, "Nao foi possivel remover o item"));
    } finally {
      setPendingVariantId(null);
    }
  }

  const shops = cart?.shops || [];
  const isEmpty = !isLoading && !error && shops.length === 0;

  return (
    <main className="mx-auto my-10 max-w-5xl px-4 text-black">
      <h1 className="text-3xl font-semibold">Carrinho</h1>

      {isLoading && <p className="mt-6">A carregar carrinho...</p>}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      )}
      {isEmpty && (
        <p className="mt-6 text-gray-600">O carrinho esta vazio.</p>
      )}

      {!isLoading && !error && shops.length > 0 && (
        <div className="mt-8 space-y-8">
          {shops.map((shop) => (
            <section
              key={shop.shopId}
              aria-labelledby={`shop-${shop.shopId}`}
              className="border-b border-gray-200 pb-6"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 id={`shop-${shop.shopId}`} className="text-xl font-semibold">
                  {shop.shopName}
                </h2>
                <p className="font-semibold">
                  Subtotal: {formatPrice(shop.subtotal)}
                </p>
              </div>

              <ul className="mt-4 space-y-4">
                {shop.items.map((item) => {
                  const isPending = pendingVariantId === item.variantId;

                  return (
                    <li
                      key={item.cartItemId || item.variantId}
                      className="grid gap-4 border border-gray-200 p-4 md:grid-cols-[96px_minmax(0,1fr)_auto]"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={productImageAlt(item.productName)}
                          className="h-24 w-24 object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center bg-gray-100 text-sm text-gray-500">
                          Sem imagem
                        </div>
                      )}

                      <div>
                        <h3 className="font-semibold">{item.productName}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Tamanho: {item.size || "N/A"} · Cor: {item.color || "N/A"}
                        </p>
                        <p className="mt-2 text-sm">
                          Preco unitario: {formatPrice(item.unitPrice)}
                        </p>
                        <p className="text-sm font-semibold">
                          Subtotal: {formatPrice(item.subtotal)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(item, item.quantity - 1)
                          }
                          disabled={isPending || item.quantity <= 1}
                          aria-label={`Diminuir quantidade de ${item.productName}`}
                          className="h-9 w-9 border border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          -
                        </button>
                        <span aria-label={`Quantidade de ${item.productName}`}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(item, item.quantity + 1)
                          }
                          disabled={isPending}
                          aria-label={`Aumentar quantidade de ${item.productName}`}
                          className="h-9 w-9 border border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          disabled={isPending}
                          className="ml-2 border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <div className="flex justify-end">
            <p className="text-2xl font-semibold">
              Total geral: {formatPrice(cart.grandTotal)}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
