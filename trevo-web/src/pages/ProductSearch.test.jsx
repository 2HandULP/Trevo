import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductSearch from "./ProductSearch";

const { mockBrowseProducts, mockSearchProducts } = vi.hoisted(() => ({
  mockBrowseProducts: vi.fn(),
  mockSearchProducts: vi.fn(),
}));

vi.mock("../services/productService", () => ({
  browseProducts: mockBrowseProducts,
  searchProducts: mockSearchProducts,
}));

globalThis.React = React;

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div>
      <span data-testid="location">{location.pathname + location.search}</span>
      <button type="button" onClick={() => navigate(-1)}>
        Voltar
      </button>
    </div>
  );
}

function renderProductSearch(initialEntries = ["/products"], initialIndex = 0) {
  const container = document.createElement("div");
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <Routes>
          <Route
            path="/products"
            element={
              <>
                <LocationProbe />
                <ProductSearch />
              </>
            }
          />
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

function changeInput(input, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    input.constructor.prototype,
    "value"
  ).set;

  act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function productsPage(products = []) {
  return {
    content: products,
    totalElements: products.length,
    totalPages: 1,
    number: 0,
    size: 20,
  };
}

async function advanceDebounce(ms = 300) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  await flushPromises();
}

describe("ProductSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSearchProducts.mockResolvedValue(productsPage());
    mockBrowseProducts.mockResolvedValue(productsPage());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("triggers search after a 300ms debounce when typing", async () => {
    const { container, unmount } = renderProductSearch();

    await flushPromises();
    mockSearchProducts.mockClear();

    changeInput(container.querySelector('input[name="q"]'), "dress");
    await advanceDebounce(299);

    expect(mockSearchProducts).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="location"]').textContent).toBe("/products");

    await advanceDebounce(1);

    expect(container.querySelector('[data-testid="location"]').textContent).toBe("/products?q=dress");
    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "dress",
      })
    );

    unmount();
  });

  it("persists filters in the URL and sends them to product search", async () => {
    const { container, unmount } = renderProductSearch();

    await flushPromises();
    mockSearchProducts.mockClear();

    changeInput(container.querySelector('input[name="minPrice"]'), "10");
    changeInput(container.querySelector('input[name="maxPrice"]'), "50");
    changeInput(container.querySelector('input[name="size"]'), "M");
    changeInput(container.querySelector('input[name="color"]'), "Azul");

    await advanceDebounce();

    const location = container.querySelector('[data-testid="location"]').textContent;
    expect(location).toContain("minPrice=10");
    expect(location).toContain("maxPrice=50");
    expect(location).toContain("size=M");
    expect(location).toContain("color=Azul");
    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        minPrice: "10",
        maxPrice: "50",
        size: "M",
        color: "Azul",
      })
    );

    unmount();
  });

  it("restores URL filter state when navigating back", async () => {
    const { container, unmount } = renderProductSearch(
      ["/products?q=dress&size=M", "/products?q=coat&color=Blue"],
      1
    );

    await flushPromises();
    expect(container.querySelector('input[name="q"]').value).toBe("coat");
    expect(container.querySelector('input[name="color"]').value).toBe("Blue");

    act(() => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Voltar")
        .click();
    });
    await flushPromises();

    expect(container.querySelector('[data-testid="location"]').textContent).toBe(
      "/products?q=dress&size=M"
    );
    expect(container.querySelector('input[name="q"]').value).toBe("dress");
    expect(container.querySelector('input[name="size"]').value).toBe("M");
    expect(container.querySelector('input[name="color"]').value).toBe("");
    expect(mockSearchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: "dress",
        size: "M",
      })
    );

    unmount();
  });

  it("uses browse endpoint for shop scoped product links without search filters", async () => {
    const { container, unmount } = renderProductSearch(["/products?shopId=7"]);

    await flushPromises();

    expect(mockBrowseProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "7",
      })
    );
    expect(mockSearchProducts).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="location"]').textContent).toBe("/products?shopId=7");

    unmount();
  });
});
