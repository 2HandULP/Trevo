import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReviewForm from "../components/ReviewForm";
import { useAuth } from "../hooks/useAuth";
import { normalizeRole, ROLES } from "../lib/roles";
import { addCartItem } from "../services/cartService";
import { getProduct } from "../services/productService";

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(price));
}

function imageUrlFrom(image) {
  if (typeof image === "string") {
    return image;
  }

  return image?.imageUrl || image?.url || image?.src || "";
}

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image, index) => ({
      id: image?.id ?? imageUrlFrom(image) ?? index,
      url: imageUrlFrom(image),
      alt: image?.alt || image?.altText || "Imagem do produto",
      displayOrder: image?.displayOrder ?? index,
    }))
    .filter((image) => image.url)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

export default function ProductDetail() {
  const { productId } = useParams();
  const { isAuthenticated, role } = useAuth();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState("");
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        const loadedProduct = await getProduct(productId);

        if (active) {
          setProduct(loadedProduct);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError.response?.data?.message ||
              loadError.response?.data?.detail ||
              "Nao foi possivel carregar o produto"
          );
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

  useEffect(() => {
    setCartSuccess("");
    setCartError("");
  }, [selectedSize, selectedColor]);

  const images = useMemo(() => normalizeImages(product?.images), [product]);
  const variants = useMemo(() => product?.variants || [], [product]);
  const sizes = useMemo(
    () => uniqueValues(variants.map((variant) => variant.size)),
    [variants]
  );
  const colors = useMemo(
    () => uniqueValues(variants.map((variant) => variant.color)),
    [variants]
  );

  const selectedVariant = variants.find(
    (variant) => variant.size === selectedSize && variant.color === selectedColor
  );
  const canReviewShop =
    isAuthenticated &&
    normalizeRole(role) === ROLES.BUYER &&
    Boolean(product?.shopId);

  function isSizeDisabled(size) {
    return !variants.some(
      (variant) =>
        variant.size === size &&
        variant.stock > 0 &&
        (!selectedColor || variant.color === selectedColor)
    );
  }

  function isColorDisabled(color) {
    return !variants.some(
      (variant) =>
        variant.color === color &&
        variant.stock > 0 &&
        (!selectedSize || variant.size === selectedSize)
    );
  }

  function showNextImage() {
    setActiveImageIndex((current) => (current + 1) % images.length);
  }

  function showPreviousImage() {
    setActiveImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  async function handleAddToCart() {
    if (!selectedVariant || selectedVariant.stock <= 0) {
      return;
    }

    setCartSuccess("");
    setCartError("");
    setIsAddingToCart(true);

    try {
      await addCartItem(selectedVariant.id, 1);
      setCartSuccess("Produto adicionado ao carrinho.");
    } catch (addError) {
      setCartError(
        getErrorMessage(
          addError,
          "Não foi possível adicionar o produto ao carrinho."
        )
      );
    } finally {
      setIsAddingToCart(false);
    }
  }

  const isAddToCartDisabled =
    !selectedSize ||
    !selectedColor ||
    !selectedVariant ||
    selectedVariant.stock <= 0 ||
    isAddingToCart;

  return (
    <main className="mx-auto my-10 max-w-5xl px-4 text-black">
      {isLoading && <p aria-live="polite">A carregar produto...</p>}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      {!isLoading && !error && product && (
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <section aria-label="Galeria do produto">
            {images.length > 0 ? (
              <>
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50">
                  <img
                    src={images[activeImageIndex].url}
                    alt={images[activeImageIndex].alt}
                    className="h-full w-full object-cover"
                  />
                </div>

                {images.length > 1 && (
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={showPreviousImage}
                      className="rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={showNextImage}
                      className="rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      Proxima
                    </button>
                  </div>
                )}

                {images.length > 1 && (
                  <div className="mt-4 flex gap-3">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        aria-label={`Mostrar imagem ${index + 1}`}
                        className={`h-20 w-20 overflow-hidden rounded border ${
                          activeImageIndex === index
                            ? "border-black"
                            : "border-gray-200"
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-gray-500">
                Sem imagem disponivel
              </div>
            )}
          </section>

          <section>
            <p className="text-sm uppercase tracking-wide text-gray-500">
              {product.brand || "Marca nao indicada"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{product.name}</h1>
            {product.price !== undefined && product.price !== null && (
              <p className="mt-3 text-2xl font-semibold">
                {formatPrice(product.price)}
              </p>
            )}
            {product.description && (
              <p className="mt-5 leading-7 text-gray-700">{product.description}</p>
            )}

            <div className="mt-6 space-y-2 text-sm">
              <p>
                <span className="font-semibold">Marca:</span>{" "}
                {product.brand || "Nao indicada"}
              </p>
              <p>
                <span className="font-semibold">Materiais:</span>{" "}
                {product.materials || "Nao indicados"}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold">Tamanho</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizes.length === 0 && (
                  <p className="text-sm text-gray-500">Sem tamanhos disponiveis</p>
                )}
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    disabled={isSizeDisabled(size)}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                      selectedSize === size
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold">Cor</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {colors.length === 0 && (
                  <p className="text-sm text-gray-500">Sem cores disponiveis</p>
                )}
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={isColorDisabled(color)}
                    onClick={() => setSelectedColor(color)}
                    className={`rounded border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                      selectedColor === color
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded border border-gray-200 bg-gray-50 p-4">
              {!selectedSize || !selectedColor ? (
                <p className="text-sm text-gray-600">
                  Seleciona tamanho e cor para ver o stock.
                </p>
              ) : selectedVariant ? (
                <p className="font-semibold">
                  {selectedVariant.stock > 0
                    ? `${selectedVariant.stock} em stock`
                    : "Sem stock"}
                </p>
              ) : (
                <p className="font-semibold">Combinacao indisponivel</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddToCartDisabled}
              className="mt-4 w-full rounded border border-black bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
            >
              {isAddingToCart ? "A adicionar..." : "Adicionar ao carrinho"}
            </button>

            {cartSuccess && (
              <p className="mt-3 text-green-600" role="status" aria-live="polite">
                {cartSuccess}
              </p>
            )}
            {cartError && (
              <p className="mt-3 text-red-600" role="alert">
                {cartError}
              </p>
            )}

            {canReviewShop && <ReviewForm shopId={product.shopId} />}
          </section>
        </div>
      )}
    </main>
  );
}
