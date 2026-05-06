import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateShop from "./CreateShop";

const { mockCreateShop } = vi.hoisted(() => ({
  mockCreateShop: vi.fn(),
}));

vi.mock("../services/shopService", () => ({
  createShop: mockCreateShop,
}));

globalThis.React = React;

function renderCreateShop() {
  const container = document.createElement("div");
  const root = createRoot(container);

  act(() => {
    root.render(<CreateShop />);
  });

  return {
    container,
    unmount: () =>
      act(() => {
        root.unmount();
      }),
  };
}

function changeField(field, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    field.constructor.prototype,
    "value"
  ).set;

  act(() => {
    valueSetter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function changeFile(input, file) {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });

  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function submitForm(container) {
  await act(async () => {
    container.querySelector("form").dispatchEvent(
      new Event("submit", {
        bubbles: true,
        cancelable: true,
      })
    );
  });
}

describe("CreateShop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((file) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
    });
  });

  it("validates required fields, previews images, and submits shop data", async () => {
    mockCreateShop.mockResolvedValue({ id: 1 });
    const { container, unmount } = renderCreateShop();

    await submitForm(container);

    expect(mockCreateShop).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Preenche nome, descricao e NIF");

    changeField(container.querySelector('input[name="name"]'), "Loja Trevo");
    changeField(container.querySelector('textarea[name="description"]'), "Moda circular");
    changeField(container.querySelector('input[name="nif"]'), "123456789");

    changeFile(
      container.querySelector('input[name="logo"]'),
      new File(["logo"], "logo.png", { type: "image/png" })
    );
    changeFile(
      container.querySelector('input[name="banner"]'),
      new File(["banner"], "banner.png", { type: "image/png" })
    );

    expect(container.querySelector('img[alt="Pre-visualizacao do logo"]').src).toBe(
      "blob:logo.png"
    );
    expect(container.querySelector('img[alt="Pre-visualizacao do banner"]').src).toBe(
      "blob:banner.png"
    );

    await submitForm(container);

    expect(mockCreateShop).toHaveBeenCalledWith({
      name: "Loja Trevo",
      description: "Moda circular",
      nif: "123456789",
      logoUrl: null,
      bannerUrl: null,
    });

    unmount();
  });
});
