import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import ReviewForm from "../components/ReviewForm";
import { useAuth } from "../hooks/useAuth";
import { productImageAlt } from "../lib/imageAlt";
import { normalizeRole, ROLES } from "../lib/roles";
import { addCartItem } from "../services/cartService";
import { getProduct } from "../services/productService";
import { getProStatus } from "../services/subscriptionService";
import { getTryOnUsage } from "../services/tryOnService";
import { uploadBuyerPhotos } from "../services/userPhotoService";

const REQUIRED_TRY_ON_PHOTOS = 3;

const BODY_TYPES = [
  { value: "slim", labelKey: "bodyTypes.slim" },
  { value: "athletic", labelKey: "bodyTypes.athletic" },
  { value: "regular", labelKey: "bodyTypes.regular" },
  { value: "plusSize", labelKey: "bodyTypes.plusSize" },
];

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

function normalizeImages(images, productName) {
  if (!Array.isArray(images)) {
    return [];
  }

  const fallbackAlt = productImageAlt(productName);

  return images
    .map((image, index) => ({
      id: image?.id ?? imageUrlFrom(image) ?? index,
      url: imageUrlFrom(image),
      alt: image?.alt?.trim() || image?.altText?.trim() || fallbackAlt,
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
    error.message ||
    fallback
  );
}

export default function ProductDetail() {
  const { t } = useTranslation("browse");
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
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [selectedBodyType, setSelectedBodyType] = useState(BODY_TYPES[0].value);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false);
  const [generatedTryOnImage, setGeneratedTryOnImage] = useState("");
  const [isPro, setIsPro] = useState(null);
  const [tryOnUsed, setTryOnUsed] = useState(false);
  const [isSeeItOpen, setIsSeeItOpen] = useState(false);
  const [seeItPhotos, setSeeItPhotos] = useState([]);
  const [seeItError, setSeeItError] = useState("");
  const [seeItSuccess, setSeeItSuccess] = useState("");
  const [isUploadingSeeIt, setIsUploadingSeeIt] = useState(false);
  const [seeItResultImage, setSeeItResultImage] = useState("");
  const seeItPhotosRef = useRef([]);

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
              t("loadProductFailed")
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
  }, [productId, t]);

  useEffect(() => {
    setCartSuccess("");
    setCartError("");
  }, [selectedSize, selectedColor]);

  useEffect(() => {
    seeItPhotosRef.current = seeItPhotos;
  }, [seeItPhotos]);

  useEffect(() => {
    return () => {
      seeItPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  const images = useMemo(
    () => normalizeImages(product?.images, product?.name),
    [product]
  );
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
  const canUseSeeItOnYourself =
    isAuthenticated && normalizeRole(role) === ROLES.BUYER;

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
          t("addToCartFailed")
        )
      );
    } finally {
      setIsAddingToCart(false);
    }
  }

  async function loadTryOnStatus() {
    if (!isAuthenticated || normalizeRole(role) !== ROLES.BUYER) {
      return;
    }
    try {
      const [proStatus, usage] = await Promise.all([
        getProStatus(),
        getTryOnUsage(productId),
      ]);
      setIsPro(proStatus.pro);
      setTryOnUsed(usage.used);
    } catch {
      // Status unavailable - modal works without badge/counter
    }
  }

  function handleOpenTryOn() {
    setIsTryOnOpen(true);
    loadTryOnStatus();
  }

  async function handleGenerateTryOn() {
    setGeneratedTryOnImage("");
    setIsGeneratingTryOn(true);

    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });

    setGeneratedTryOnImage(images[activeImageIndex]?.url || "");
    setIsGeneratingTryOn(false);

    if (isPro === false && !tryOnUsed) {
      setTryOnUsed(true);
    }
  }

  function handleSeeItPhotoChange(event) {
    const files = [...event.target.files];
    setSeeItError("");
    setSeeItSuccess("");
    setSeeItResultImage("");

    setSeeItPhotos((currentPhotos) => {
      currentPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));

      return files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    });

    if (files.length !== REQUIRED_TRY_ON_PHOTOS) {
      setSeeItError("Seleciona exatamente 3 imagens.");
    }
  }

  function clearSeeItPhotos() {
    setSeeItPhotos((currentPhotos) => {
      currentPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  }

  function closeSeeItModal() {
    clearSeeItPhotos();
    setIsSeeItOpen(false);
    setSeeItError("");
    setSeeItSuccess("");
    setSeeItResultImage("");
  }

  async function handleSeeItSubmit(event) {
    event.preventDefault();
    setSeeItError("");
    setSeeItSuccess("");
    setSeeItResultImage("");

    if (seeItPhotos.length !== REQUIRED_TRY_ON_PHOTOS) {
      setSeeItError("Seleciona exatamente 3 imagens.");
      return;
    }

    setIsUploadingSeeIt(true);

    try {
      await uploadBuyerPhotos(seeItPhotos.map((photo) => photo.file));
      setSeeItSuccess(t("photosUploaded"));
      setSeeItResultImage(images[activeImageIndex]?.url || seeItPhotos[0].previewUrl);
    } catch (uploadError) {
      setSeeItError(getErrorMessage(uploadError, t("uploadPhotosFailed")));
    } finally {
      setIsUploadingSeeIt(false);
    }
  }

  const isAddToCartDisabled =
    !selectedSize ||
    !selectedColor ||
    !selectedVariant ||
    selectedVariant.stock <= 0 ||
    isAddingToCart;

  return (
    <main className="page-shell">
      {isLoading && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]" aria-live="polite">
          <div className="aspect-square animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-white" />
            <div className="h-12 w-full animate-pulse rounded bg-white" />
            <div className="h-40 w-full animate-pulse rounded bg-white" />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}

      {!isLoading && !error && product && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <section aria-label={t("productGallery")}>
            {images.length > 0 ? (
              <>
                <div className="group flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg bg-white shadow-[var(--shadow-soft)] sm:aspect-square">
                  <img
                    src={images[activeImageIndex].url}
                    alt={images[activeImageIndex].alt}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>

                {images.length > 1 && (
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={showPreviousImage}
                      className="btn btn-secondary min-h-10 px-4 py-2 text-sm"
                    >
                      {t("previous", { ns: "common" })}
                    </button>
                    <button
                      type="button"
                      onClick={showNextImage}
                      className="btn btn-secondary min-h-10 px-4 py-2 text-sm"
                    >
                      {t("next", { ns: "common" })}
                    </button>
                  </div>
                )}

                {images.length > 1 && (
                  <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        aria-label={t("showImage", { index: index + 1 })}
                        className={`aspect-square overflow-hidden rounded-lg border-2 bg-white transition hover:-translate-y-0.5 ${
                          activeImageIndex === index
                            ? "border-[var(--color-primary)] shadow-[var(--shadow-card)]"
                            : "border-transparent opacity-75"
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
              <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-black/15 bg-white text-[var(--color-muted)] shadow-[var(--shadow-card)]">
                {t("noImageAvailable")}
              </div>
            )}
          </section>

          <section className="h-fit rounded-lg border border-black/10 bg-white p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-28">
            <p className="badge">
              {product.brand || t("brandMissing")}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight">{product.name}</h1>
            {product.price !== undefined && product.price !== null && (
              <p className="mt-4 text-3xl font-black text-[var(--color-primary-dark)]">
                {formatPrice(product.price)}
              </p>
            )}
            {product.description && (
              <p className="mt-5 leading-7 text-[var(--color-muted)]">{product.description}</p>
            )}

            <div className="mt-6 grid gap-3 rounded-lg bg-[var(--color-surface-raised)] p-4 text-sm sm:grid-cols-2">
              <p>
                <span className="block font-black">{t("brand")}</span>
                {product.brand || t("notIndicated")}
              </p>
              <p>
                <span className="block font-black">{t("materials")}</span>
                {product.materials || t("notIndicatedPlural")}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold">{t("size")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizes.length === 0 && (
                  <p className="text-sm text-gray-500">{t("noSizes")}</p>
                )}
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    disabled={isSizeDisabled(size)}
                    onClick={() => setSelectedSize(size)}
                    className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                      selectedSize === size
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold">{t("color")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {colors.length === 0 && (
                  <p className="text-sm text-gray-500">{t("noColors")}</p>
                )}
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={isColorDisabled(color)}
                    onClick={() => setSelectedColor(color)}
                    className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                      selectedColor === color
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-black/10 bg-[var(--color-primary-soft)] p-4">
              {!selectedSize || !selectedColor ? (
                <p className="text-sm font-bold text-[var(--color-primary-dark)]">
                  {t("selectSizeColor")}
                </p>
              ) : selectedVariant ? (
                <p className="font-semibold">
                  {selectedVariant.stock > 0
                    ? t("inStock", { count: selectedVariant.stock })
                    : t("outOfStock")}
                </p>
              ) : (
                <p className="font-semibold">{t("combinationUnavailable")}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddToCartDisabled}
              className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAddingToCart ? t("addingToCart") : t("addToCart")}
            </button>

            <button
              type="button"
              onClick={handleOpenTryOn}
              className="btn btn-secondary mt-3 w-full"
            >
              {t("virtualTryOn")}
            </button>

            {canUseSeeItOnYourself && (
              <button
                type="button"
                onClick={() => setIsSeeItOpen(true)}
                className="btn btn-secondary mt-3 w-full"
              >
                {t("seeItOnYourself")}
              </button>
            )}

            {cartSuccess && (
              <p className="alert alert-success mt-3" role="status" aria-live="polite">
                {cartSuccess}
              </p>
            )}
            {cartError && (
              <p className="alert alert-error mt-3" role="alert">
                {cartError}
              </p>
            )}

            {canReviewShop && <ReviewForm shopId={product.shopId} />}
          </section>
        </div>
      )}

      {isTryOnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="virtual-try-on-title"
            className="w-full max-w-lg rounded bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="virtual-try-on-title" className="text-xl font-semibold">
                    {t("tryOnTitle")}
                  </h2>
                  {isPro === true && (
                    <span
                      className="rounded bg-yellow-400 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-yellow-900"
                      aria-label="Conta Pro: gerações ilimitadas"
                    >
                      PRO · Ilimitado
                    </span>
                  )}
                  {isPro === false && !tryOnUsed && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      1 experimento gratuito
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {t("tryOnDescription")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTryOnOpen(false)}
                className="rounded border border-gray-300 px-3 py-1 text-sm"
              >
                {t("close", { ns: "common" })}
              </button>
            </div>

            {isPro === false && tryOnUsed && (
              <div className="mt-4 rounded border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                Experimenta gratuito esgotado.{" "}
                <Link to="/pro" className="font-semibold underline">
                  Atualiza para Pro
                </Link>{" "}
                para gerações ilimitadas.
              </div>
            )}

            <fieldset className="mt-6">
              <legend className="font-semibold">{t("model")}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {BODY_TYPES.map((bodyType) => (
                  <label
                    key={bodyType.value}
                    className={`rounded border px-4 py-3 text-sm ${
                      selectedBodyType === bodyType.value
                        ? "border-black bg-black text-white"
                        : "border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bodyType"
                      value={bodyType.value}
                      checked={selectedBodyType === bodyType.value}
                      onChange={() => setSelectedBodyType(bodyType.value)}
                      className="mr-2"
                    />
                    {t(bodyType.labelKey)}
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={handleGenerateTryOn}
              disabled={isGeneratingTryOn || images.length === 0 || (isPro === false && tryOnUsed)}
              className="mt-6 w-full rounded border border-black bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
            >
              {isGeneratingTryOn ? t("generatingTryOn") : t("generateTryOn")}
            </button>

            {images.length === 0 && (
              <p className="mt-3 text-sm text-gray-600">
                {t("noTryOnImage")}
              </p>
            )}

            {generatedTryOnImage && (
              <div className="mt-6">
                <h3 className="font-semibold">{t("result")}</h3>
                <img
                  src={generatedTryOnImage}
                  alt={t("tryOnResultAlt", { bodyType: t(BODY_TYPES.find((bodyType) => bodyType.value === selectedBodyType)?.labelKey || BODY_TYPES[0].labelKey) })}
                  className="mt-3 aspect-square w-full rounded border border-gray-200 object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {isSeeItOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="see-it-on-yourself-title"
            className="w-full max-w-2xl rounded bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="see-it-on-yourself-title" className="text-xl font-semibold">
                  {t("seeItTitle")}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {t("seeItDescription")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSeeItModal}
                className="rounded border border-gray-300 px-3 py-1 text-sm"
              >
                {t("close", { ns: "common" })}
              </button>
            </div>

            <form onSubmit={handleSeeItSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="see-it-photos" className="block font-semibold">
                  {t("images")}
                </label>
                <input
                  id="see-it-photos"
                  type="file"
                  name="seeItPhotos"
                  accept="image/*"
                  multiple
                  onChange={handleSeeItPhotoChange}
                  className="mt-2 block w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>

              {seeItError && (
                <p className="text-red-600" role="alert">
                  {seeItError}
                </p>
              )}
              {seeItSuccess && (
                <p className="text-green-600" role="status" aria-live="polite">
                  {seeItSuccess}
                </p>
              )}

              {seeItPhotos.length > 0 && (
                <ul className="grid grid-cols-3 gap-3">
                  {seeItPhotos.map((photo, index) => (
                    <li key={photo.previewUrl}>
                      <img
                        src={photo.previewUrl}
                        alt={t("seeItPreviewAlt", { index: index + 1 })}
                        className="aspect-square w-full rounded object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="submit"
                disabled={isUploadingSeeIt || seeItPhotos.length !== REQUIRED_TRY_ON_PHOTOS}
                className="w-full rounded border border-black bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
              >
                {isUploadingSeeIt ? t("uploading") : t("generateResult")}
              </button>
            </form>

            {seeItResultImage && (
              <div className="mt-6">
                <h3 className="font-semibold">{t("customResult")}</h3>
                <img
                  src={seeItResultImage}
                  alt={t("seeItResultAlt")}
                  className="mt-3 aspect-square w-full rounded border border-gray-200 object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
