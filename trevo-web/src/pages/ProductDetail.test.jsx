import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductDetail from "./ProductDetail";

const { mockAddCartItem, mockGetProduct } = vi.hoisted(() => ({
  mockAddCartItem: vi.fn(),
  mockGetProduct: vi.fn(),
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
});
