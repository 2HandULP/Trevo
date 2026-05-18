import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewForm from "./ReviewForm";

const { mockCreateReview } = vi.hoisted(() => ({
  mockCreateReview: vi.fn(),
}));

vi.mock("../services/reviewService", () => ({
  createReview: mockCreateReview,
}));

globalThis.React = React;

function renderReviewForm() {
  const container = document.createElement("div");
  const root = createRoot(container);

  act(() => {
    root.render(<ReviewForm shopId={5} />);
  });

  return {
    container,
    unmount: () =>
      act(() => {
        root.unmount();
      }),
  };
}

async function click(button) {
  await act(async () => {
    button.click();
  });
}

function changeTextarea(textarea, value) {
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    ).set;
    valueSetter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submitForm(container) {
  await act(async () => {
    container.querySelector("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  });
}

function buttonByText(container, text) {
  return [...container.querySelectorAll("button")].find(
    (button) => button.textContent === text
  );
}

describe("ReviewForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateReview.mockResolvedValue({
      id: 10,
      shopId: 5,
      rating: 5,
      comment: null,
    });
  });

  it("lets users click stars", async () => {
    const { container, unmount } = renderReviewForm();

    await click(container.querySelector('button[aria-label="4 estrelas"]'));

    expect(container.querySelector('button[aria-label="4 estrelas"]').textContent).toBe(
      "★"
    );
    expect(container.querySelector('button[aria-label="5 estrelas"]').textContent).toBe(
      "☆"
    );

    unmount();
  });

  it("does not submit with zero stars", async () => {
    const { container, unmount } = renderReviewForm();
    const submitButton = buttonByText(container, "Enviar avaliação");

    expect(submitButton.disabled).toBe(true);

    await submitForm(container);

    expect(mockCreateReview).not.toHaveBeenCalled();

    unmount();
  });

  it("submits with optional empty text", async () => {
    const { container, unmount } = renderReviewForm();

    await click(container.querySelector('button[aria-label="5 estrelas"]'));
    await submitForm(container);

    expect(mockCreateReview).toHaveBeenCalledWith(5, {
      rating: 5,
      comment: null,
    });

    unmount();
  });

  it("submits rating and comment", async () => {
    const { container, unmount } = renderReviewForm();

    await click(container.querySelector('button[aria-label="3 estrelas"]'));
    changeTextarea(container.querySelector("textarea"), "Boa experiência.");
    await submitForm(container);

    expect(mockCreateReview).toHaveBeenCalledWith(5, {
      rating: 3,
      comment: "Boa experiência.",
    });

    unmount();
  });

  it("shows success after submit", async () => {
    const { container, unmount } = renderReviewForm();

    await click(container.querySelector('button[aria-label="5 estrelas"]'));
    await submitForm(container);

    expect(container.querySelector('[role="status"]').textContent).toContain(
      "Avaliação enviada com sucesso."
    );

    unmount();
  });

  it("shows backend error after submit failure", async () => {
    mockCreateReview.mockRejectedValue({
      response: {
        data: {
          detail: "Buyer has no delivered order from this shop",
        },
      },
    });
    const { container, unmount } = renderReviewForm();

    await click(container.querySelector('button[aria-label="5 estrelas"]'));
    await submitForm(container);

    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "Buyer has no delivered order from this shop"
    );

    unmount();
  });
});
