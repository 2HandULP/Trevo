import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductDetail from "./ProductDetail";

const { mockAddCartItem, mockGetProduct, mockUseAuth } = vi.hoisted(() => ({
  mockAddCartItem: vi.fn(),
  mockGetProduct: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("../services/cartService", () => ({
  addCartItem: mockAddCartItem,
}));

vi.mock("../services/productService", () => ({
  getProduct: mockGetProduct,
}));

globalThis.React = React;

const baseProduct = {
  id: 1,
  shopId: 10,
  name: "Camisa Linho",
  description: "Camisa leve em linho.",
  price: 35,
  brand: "Trevo",
  materials: "Linho 100%",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00",
};

function renderProductDetail(initialPath = "/products/1") {
  const container = document.createElement("div");
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/products/:productId" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );
  });

  return {
    container,
    unmount: () =>
      act(() => {
        root.unmount();
      }),
  };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

function clickButton(button) {
  act(() => {
    button.click();
  });
}

async function clickButtonAsync(button) {
  await act(async () => {
    button.click();
  });
}

function buttonByText(container, text) {
  return [...container.querySelectorAll("button")].find(
    (button) => button.textContent === text
  );
}

describe("ProductDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      role: "BUYER",
    });
    mockAddCartItem.mockResolvedValue({});
  });

  it("changes the main image when the carousel advances", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [
        { id: 1, imageUrl: "https://example.test/front.jpg", alt: "Frente" },
        { id: 2, imageUrl: "https://example.test/back.jpg", alt: "Costas" },
      ],
      variants: [],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    expect(mockGetProduct).toHaveBeenCalledWith("1");
    expect(container.querySelector('img[alt="Frente"]').src).toBe(
      "https://example.test/front.jpg"
    );

    clickButton(buttonByText(container, "Proxima"));

    expect(container.querySelector("section img").src).toBe(
      "https://example.test/back.jpg"
    );

    unmount();
  });

  it("shows stock after selecting size and color", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [{ id: 1, productId: 1, size: "M", color: "Blue", stock: 3 }],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    clickButton(buttonByText(container, "M"));
    clickButton(buttonByText(container, "Blue"));

    expect(container.textContent).toContain("3 em stock");

    unmount();
  });

  it("keeps add to cart disabled until size and color are selected", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [{ id: 1, productId: 1, size: "M", color: "Blue", stock: 3 }],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    const addButton = buttonByText(container, "Adicionar ao carrinho");

    expect(addButton.disabled).toBe(true);

    clickButton(buttonByText(container, "M"));

    expect(addButton.disabled).toBe(true);

    clickButton(buttonByText(container, "Blue"));

    expect(addButton.disabled).toBe(false);

    unmount();
  });

  it("keeps add to cart disabled for a variant without stock", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [{ id: 2, productId: 1, size: "L", color: "Black", stock: 0 }],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    clickButton(buttonByText(container, "L"));
    clickButton(buttonByText(container, "Black"));

    expect(buttonByText(container, "Adicionar ao carrinho").disabled).toBe(true);

    unmount();
  });

  it("adds the selected variant to the cart and shows success", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [{ id: 7, productId: 1, size: "M", color: "Blue", stock: 3 }],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    clickButton(buttonByText(container, "M"));
    clickButton(buttonByText(container, "Blue"));
    await clickButtonAsync(buttonByText(container, "Adicionar ao carrinho"));

    expect(mockAddCartItem).toHaveBeenCalledWith(7, 1);
    expect(container.querySelector('[role="status"]').textContent).toContain(
      "Produto adicionado ao carrinho."
    );

    unmount();
  });

  it("shows an error when adding the selected variant fails", async () => {
    mockAddCartItem.mockRejectedValue({
      response: {
        data: {
          detail: "Requested quantity exceeds available stock",
        },
      },
    });
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [{ id: 7, productId: 1, size: "M", color: "Blue", stock: 3 }],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    clickButton(buttonByText(container, "M"));
    clickButton(buttonByText(container, "Blue"));
    await clickButtonAsync(buttonByText(container, "Adicionar ao carrinho"));

    expect(mockAddCartItem).toHaveBeenCalledWith(7, 1);
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "Requested quantity exceeds available stock"
    );

    unmount();
  });

  it("disables out-of-stock variant options", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [
        { id: 1, productId: 1, size: "M", color: "Blue", stock: 3 },
        { id: 2, productId: 1, size: "L", color: "Black", stock: 0 },
      ],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    expect(buttonByText(container, "L").disabled).toBe(true);

    unmount();
  });

  it("renders a fallback when the product has no images", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    expect(container.textContent).toContain("Sem imagem disponivel");
    expect(container.textContent).toContain("Camisa Linho");

    unmount();
  });

  it("shows the Virtual Try-On button on product detail", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    expect(buttonByText(container, "Virtual Try-On")).not.toBeUndefined();

    unmount();
  });

  it("opens a Virtual Try-On modal when clicking the button", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();
    clickButton(buttonByText(container, "Virtual Try-On"));

    const dialog = container.querySelector('[role="dialog"]');

    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("Virtual Try-On");

    unmount();
  });

  it("shows at least four body type options in the Virtual Try-On modal", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();
    clickButton(buttonByText(container, "Virtual Try-On"));

    expect(container.querySelectorAll('input[name="bodyType"]').length).toBeGreaterThanOrEqual(4);
    expect(container.textContent).toContain("Slim");
    expect(container.textContent).toContain("Athletic");
    expect(container.textContent).toContain("Regular");
    expect(container.textContent).toContain("Plus Size");

    unmount();
  });

  it("shows loading while generating and then displays the try-on image", async () => {
    vi.useFakeTimers();
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [
        { id: 1, imageUrl: "https://example.test/front.jpg", alt: "Frente" },
      ],
      variants: [],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();
    clickButton(buttonByText(container, "Virtual Try-On"));
    await clickButtonAsync(buttonByText(container, "Generate Try-On"));

    expect(container.textContent).toContain("A gerar try-on...");

    await act(async () => {
      vi.advanceTimersByTime(150);
      await Promise.resolve();
    });

    const resultImage = container.querySelector(
      'img[alt="Resultado Virtual Try-On Slim"]'
    );

    expect(resultImage).not.toBeNull();
    expect(resultImage.src).toBe("https://example.test/front.jpg");

    unmount();
    vi.useRealTimers();
  });

  it("renders ReviewForm only for authenticated buyers", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [],
    });

    const { container, unmount } = renderProductDetail();

    await flushPromises();

    expect(container.textContent).toContain("Avaliar esta loja");

    unmount();
  });

  it("does not render ReviewForm for shop owners or visitors", async () => {
    mockGetProduct.mockResolvedValue({
      ...baseProduct,
      images: [],
      variants: [],
    });
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      role: "SHOP_OWNER",
    });

    const shopOwnerRender = renderProductDetail();

    await flushPromises();

    expect(shopOwnerRender.container.textContent).not.toContain("Avaliar esta loja");

    shopOwnerRender.unmount();

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      role: null,
    });

    const visitorRender = renderProductDetail();

    await flushPromises();

    expect(visitorRender.container.textContent).not.toContain("Avaliar esta loja");

    visitorRender.unmount();
  });
});
