import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Sparkles,
  Camera,
  X,
  CheckCircle2,
} from "lucide-react";
import ReviewForm from "../components/ReviewForm";
import { useAuth } from "../hooks/useAuth";
import { productImageAlt } from "../lib/imageAlt";
import { normalizeRole, ROLES } from "../lib/roles";
import { addCartItem } from "../services/cartService";
import { getProduct } from "../services/productService";
import { getProStatus } from "../services/subscriptionService";
import { generatePersonalizedTryOn, generateTryOn, getTryOnUsage } from "../services/tryOnService";
import LoadingState from "../components/LoadingState";
import Alert from "../components/Alert";

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
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(price));
}

function imageUrlFrom(image) {
  if (typeof image === "string") return image;
  return image?.imageUrl || image?.url || image?.src || "";
}

function normalizeImages(images, productName) {
  if (!Array.isArray(images)) return [];
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
  const [tryOnError, setTryOnError] = useState("");
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
    if (!selectedVariant || selectedVariant.stock <= 0) return;

    setCartSuccess("");
    setCartError("");
    setIsAddingToCart(true);

    try {
      await addCartItem(selectedVariant.id, 1);
      setCartSuccess("Produto adicionado ao carrinho.");
    } catch (addError) {
      setCartError(getErrorMessage(addError, t("addToCartFailed")));
    } finally {
      setIsAddingToCart(false);
    }
  }

  async function loadTryOnStatus() {
    if (!isAuthenticated || normalizeRole(role) !== ROLES.BUYER) return;
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
    setTryOnError("");
    setIsGeneratingTryOn(true);

    try {
      const result = await generateTryOn(Number(productId), selectedBodyType);
      setGeneratedTryOnImage(result.imageUrl);

      if (isPro === false && !tryOnUsed) {
        setTryOnUsed(true);
      }
    } catch (err) {
      setTryOnError(getErrorMessage(err, t("tryOnFailed")));
    } finally {
      setIsGeneratingTryOn(false);
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
      const result = await generatePersonalizedTryOn(
        Number(productId),
        seeItPhotos.map((photo) => photo.file)
      );
      setSeeItResultImage(result.imageUrl);
      setSeeItSuccess(t("tryOnGenerated"));
    } catch (uploadError) {
      setSeeItError(getErrorMessage(uploadError, t("tryOnFailed")));
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
    <div className="page-shell max-w-6xl">
      {isLoading && <LoadingState label="A carregar produto..." />}
      {error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && product && (
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          {/* Gallery */}
          <section aria-label={t("productGallery")}>
            {images.length > 0 ? (
              <>
                <div className="relative aspect-square overflow-hidden rounded border border-ink-200 bg-ink-50">
                  <img
                    src={images[activeImageIndex].url}
                    alt={images[activeImageIndex].alt}
                    className="h-full w-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={showPreviousImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-ink-200 flex items-center justify-center shadow-sm transition-colors"
                        aria-label={t("previous", { ns: "common" })}
                      >
                        <ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={showNextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-ink-200 flex items-center justify-center shadow-sm transition-colors"
                        aria-label={t("next", { ns: "common" })}
                      >
                        <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        aria-label={t("showImage", { index: index + 1 })}
                        className={`shrink-0 h-16 w-16 overflow-hidden rounded transition-all ${
                          activeImageIndex === index
                            ? "ring-2 ring-ink-900 ring-offset-2"
                            : "border border-ink-200 hover:border-ink-400"
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
              <div className="flex aspect-square items-center justify-center rounded border border-dashed border-ink-300 bg-ink-50 text-ink-400">
                <div className="flex flex-col items-center gap-2">
                  <ImageOff className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-xs">Sem imagem disponível</span>
                </div>
              </div>
            )}
          </section>

          {/* Buy panel */}
          <section>
            <p className="eyebrow">{product.brand || t("brandMissing")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight leading-tight">{product.name}</h1>
            {product.price !== undefined && product.price !== null && (
              <p className="mt-3 text-2xl font-bold tabular">{formatPrice(product.price)}</p>
            )}
            {product.description && (
              <p className="mt-5 leading-relaxed text-ink-600">{product.description}</p>
            )}

            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-ink-500">{t("brand")}</dt>
              <dd className="text-ink-900">{product.brand || t("notIndicated")}</dd>
              <dt className="text-ink-500">{t("materials")}</dt>
              <dd className="text-ink-900">{product.materials || t("notIndicatedPlural")}</dd>
            </dl>

            <div className="mt-8">
              <h2 className="text-sm font-semibold mb-2.5">{t("size")}</h2>
              <div className="flex flex-wrap gap-2">
                {sizes.length === 0 && (
                  <p className="text-sm text-ink-500">{t("noSizes")}</p>
                )}
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    disabled={isSizeDisabled(size)}
                    onClick={() => setSelectedSize(size)}
                    className={
                      "opt-pill " +
                      (selectedSize === size ? "opt-pill-selected" : "")
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold mb-2.5">{t("color")}</h2>
              <div className="flex flex-wrap gap-2">
                {colors.length === 0 && (
                  <p className="text-sm text-ink-500">{t("noColors")}</p>
                )}
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={isColorDisabled(color)}
                    onClick={() => setSelectedColor(color)}
                    className={
                      "opt-pill " +
                      (selectedColor === color ? "opt-pill-selected" : "")
                    }
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock status */}
            <div
              className={
                "mt-6 px-3.5 py-2.5 rounded border text-sm " +
                (!selectedSize || !selectedColor
                  ? "bg-ink-50 border-ink-200 text-ink-600"
                  : selectedVariant && selectedVariant.stock > 0
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700")
              }
            >
              {!selectedSize || !selectedColor ? (
                t("selectSizeColor")
              ) : selectedVariant ? (
                selectedVariant.stock > 0
                  ? t("inStock", { count: selectedVariant.stock })
                  : t("outOfStock")
              ) : (
                t("combinationUnavailable")
              )}
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddToCartDisabled}
              className="btn-primary w-full mt-4 py-3.5"
            >
              {isAddingToCart ? t("addingToCart") : t("addToCart")}
            </button>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenTryOn}
                disabled={!isAuthenticated}
                title={!isAuthenticated ? t("loginRequired") : ""}
                className="btn-secondary py-3"
              >
                <Sparkles className="w-4 h-4 text-clover-500" strokeWidth={1.8} />
                {t("virtualTryOn")}
              </button>

              {canUseSeeItOnYourself && (
                <button
                  type="button"
                  onClick={() => setIsSeeItOpen(true)}
                  className="btn-secondary py-3"
                >
                  <Camera className="w-4 h-4 text-clover-500" strokeWidth={1.8} />
                  {t("seeItOnYourself")}
                </button>
              )}
            </div>

            {cartSuccess && (
              <Alert variant="success" className="mt-3">{cartSuccess}</Alert>
            )}
            {cartError && (
              <Alert variant="error" className="mt-3">{cartError}</Alert>
            )}

            {canReviewShop && (
              <div className="mt-10 pt-6 border-t border-ink-100">
                <ReviewForm shopId={product.shopId} />
              </div>
            )}
          </section>
        </div>
      )}

      {/* Virtual try-on modal */}
      {isTryOnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="virtual-try-on-title"
            className="w-full max-w-lg rounded-md bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="virtual-try-on-title" className="text-xl font-semibold tracking-tight">
                    {t("tryOnTitle")}
                  </h2>
                  {isPro === true && (
                    <span className="badge badge-pro" aria-label="Conta Pro: gerações ilimitadas">
                      PRO · Ilimitado
                    </span>
                  )}
                  {isPro === false && !tryOnUsed && (
                    <span className="badge badge-neutral">1 experimento gratuito</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-500">{t("tryOnDescription")}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTryOnOpen(false)}
                className="w-8 h-8 rounded inline-flex items-center justify-center border border-ink-200 hover:bg-ink-50 transition-colors"
                aria-label={t("close", { ns: "common" })}
              >
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>

            {isPro === false && tryOnUsed && (
              <Alert variant="warning" className="mt-4">
                Experimento gratuito esgotado.{" "}
                <Link to="/pro" className="font-semibold underline text-clover-700">
                  Atualiza para Pro
                </Link>{" "}
                para gerações ilimitadas.
              </Alert>
            )}

            <fieldset className="mt-6">
              <legend className="text-sm font-semibold mb-2">{t("model")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {BODY_TYPES.map((bodyType) => (
                  <label
                    key={bodyType.value}
                    className={
                      "opt-pill flex items-center gap-2 cursor-pointer " +
                      (selectedBodyType === bodyType.value ? "opt-pill-selected" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="bodyType"
                      value={bodyType.value}
                      checked={selectedBodyType === bodyType.value}
                      onChange={() => setSelectedBodyType(bodyType.value)}
                      className="accent-clover-500"
                    />
                    {t(bodyType.labelKey)}
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={handleGenerateTryOn}
              disabled={
                isGeneratingTryOn ||
                images.length === 0 ||
                (isPro === false && tryOnUsed)
              }
              className="btn-primary w-full mt-6 py-3"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.8} />
              {isGeneratingTryOn ? t("generatingTryOn") : t("generateTryOn")}
            </button>

            {tryOnError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {tryOnError}
              </p>
            )}

            {images.length === 0 && (
              <p className="mt-3 text-sm text-ink-500">{t("noTryOnImage")}</p>
            )}

            {generatedTryOnImage && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={1.8} />
                  {t("result")}
                </h3>
                <img
                  src={generatedTryOnImage}
                  alt={t("tryOnResultAlt", {
                    bodyType: t(
                      BODY_TYPES.find((bodyType) => bodyType.value === selectedBodyType)
                        ?.labelKey || BODY_TYPES[0].labelKey
                    ),
                  })}
                  className="mt-3 aspect-square w-full rounded border border-ink-200 object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* "See it on yourself" modal */}
      {isSeeItOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="see-it-on-yourself-title"
            className="w-full max-w-2xl rounded-md bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="see-it-on-yourself-title" className="text-xl font-semibold tracking-tight">
                  {t("seeItTitle")}
                </h2>
                <p className="mt-2 text-sm text-ink-500">{t("seeItDescription")}</p>
              </div>
              <button
                type="button"
                onClick={closeSeeItModal}
                className="w-8 h-8 rounded inline-flex items-center justify-center border border-ink-200 hover:bg-ink-50 transition-colors"
                aria-label={t("close", { ns: "common" })}
              >
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleSeeItSubmit} className="mt-6 flex flex-col gap-5">
              <div className="field">
                <label htmlFor="see-it-photos" className="field-label">
                  {t("images")}
                </label>
                <input
                  id="see-it-photos"
                  type="file"
                  name="seeItPhotos"
                  accept="image/*"
                  multiple
                  onChange={handleSeeItPhotoChange}
                  className="input file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-ink-100 file:text-ink-800 file:font-medium file:text-xs hover:file:bg-ink-200"
                />
                <p className="field-help">Carrega exatamente 3 imagens.</p>
              </div>

              {seeItError && <Alert variant="error">{seeItError}</Alert>}
              {seeItSuccess && <Alert variant="success">{seeItSuccess}</Alert>}

              {seeItPhotos.length > 0 && (
                <ul className="grid grid-cols-3 gap-3">
                  {seeItPhotos.map((photo, index) => (
                    <li key={photo.previewUrl}>
                      <img
                        src={photo.previewUrl}
                        alt={t("seeItPreviewAlt", { index: index + 1 })}
                        className="aspect-square w-full rounded border border-ink-200 object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="submit"
                disabled={
                  isUploadingSeeIt || seeItPhotos.length !== REQUIRED_TRY_ON_PHOTOS
                }
                className="btn-primary w-full py-3"
              >
                {isUploadingSeeIt ? t("uploading") : t("generateResult")}
              </button>
            </form>

            {seeItResultImage && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={1.8} />
                  {t("customResult")}
                </h3>
                <img
                  src={seeItResultImage}
                  alt={t("seeItResultAlt")}
                  className="mt-3 aspect-square w-full rounded border border-ink-200 object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
