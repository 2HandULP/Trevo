import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewsSection from "./ReviewsSection";

const { mockGetShopReviews } = vi.hoisted(() => ({
  mockGetShopReviews: vi.fn(),
}));

vi.mock("../services/reviewService", () => ({
  getShopReviews: mockGetShopReviews,
}));

globalThis.React = React;

const firstPage = {
  averageRating: 4.5,
  totalElements: 2,
  totalPages: 2,
  page: 0,
  size: 5,
  reviews: [
    {
      id: 10,
      buyerName: "Ana Silva",
      rating: 5,
      comment: "Excelente atendimento.",
      createdAt: "2026-05-01T10:00:00Z",
    },
  ],
};

function renderReviewsSection() {
  const container = document.createElement("div");
  const root = createRoot(container);

  act(() => {
    root.render(<ReviewsSection shopId={7} />);
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

async function click(button) {
  await act(async () => {
    button.click();
  });
}

function buttonByText(container, text) {
  return [...container.querySelectorAll("button")].find(
    (button) => button.textContent === text
  );
}

describe("ReviewsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetShopReviews.mockResolvedValue(firstPage);
  });

  it("shows the average rating with star icons", async () => {
    const { container, unmount } = renderReviewsSection();

    await flushPromises();

    expect(mockGetShopReviews).toHaveBeenCalledWith(7, { page: 0, size: 5 });
    expect(container.textContent).toContain("Média:");
    expect(container.textContent).toContain("4.5");
    expect(container.textContent).toContain("★★★★★");
    expect(container.querySelector('[aria-label="4.5 estrelas"]')).not.toBeNull();

    unmount();
  });

  it("shows reviews with buyer name, date, and comment", async () => {
    const { container, unmount } = renderReviewsSection();

    await flushPromises();

    expect(container.textContent).toContain("Ana Silva");
    expect(container.textContent).toContain("01/05/26");
    expect(container.textContent).toContain("Excelente atendimento.");

    unmount();
  });

  it("loads more reviews and appends them", async () => {
    mockGetShopReviews
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce({
        averageRating: 4.5,
        totalElements: 2,
        totalPages: 2,
        page: 1,
        size: 5,
        reviews: [
          {
            id: 11,
            buyerName: "Bruno Costa",
            rating: 4,
            comment: "Boa experiência.",
            createdAt: "2026-05-02T10:00:00Z",
          },
        ],
      });
    const { container, unmount } = renderReviewsSection();

    await flushPromises();
    await click(buttonByText(container, "Carregar mais"));
    await flushPromises();

    expect(mockGetShopReviews).toHaveBeenLastCalledWith(7, { page: 1, size: 5 });
    expect(container.textContent).toContain("Ana Silva");
    expect(container.textContent).toContain("Bruno Costa");
    expect(buttonByText(container, "Carregar mais")).toBeUndefined();

    unmount();
  });

  it("shows an empty state when there are no reviews", async () => {
    mockGetShopReviews.mockResolvedValue({
      averageRating: null,
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 5,
      reviews: [],
    });
    const { container, unmount } = renderReviewsSection();

    await flushPromises();

    expect(container.textContent).toContain("Sem avaliações");

    unmount();
  });

  it("shows an error when reviews cannot be loaded", async () => {
    mockGetShopReviews.mockRejectedValue({
      response: {
        data: {
          detail: "Shop not found",
        },
      },
    });
    const { container, unmount } = renderReviewsSection();

    await flushPromises();

    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "Shop not found"
    );

    unmount();
  });

  it("retries after an initial error and replaces the list", async () => {
    mockGetShopReviews
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(firstPage);
    const { container, unmount } = renderReviewsSection();

    await flushPromises();

    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "Não foi possível carregar avaliações"
    );

    await click(buttonByText(container, "Tentar novamente"));
    await flushPromises();

    expect(mockGetShopReviews).toHaveBeenLastCalledWith(7, { page: 0, size: 5 });
    expect(container.textContent).toContain("Ana Silva");
    expect(container.querySelector('[role="alert"]')).toBeNull();

    unmount();
  });
});
