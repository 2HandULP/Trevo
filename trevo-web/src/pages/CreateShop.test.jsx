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
  });

  it("validates required fields", async () => {
    const { container, unmount } = renderCreateShop();

    await submitForm(container);

    expect(mockCreateShop).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Preenche nome, descrição e NIF");

    unmount();
  });

  it("validates NIF format before submitting", async () => {
    const { container, unmount } = renderCreateShop();

    changeField(container.querySelector('input[name="name"]'), "Loja Trevo");
    changeField(container.querySelector('textarea[name="description"]'), "Moda circular");
    changeField(container.querySelector('input[name="nif"]'), "123");

    await submitForm(container);

    expect(mockCreateShop).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "O NIF deve ter exatamente 9 dígitos"
    );

    unmount();
  });

  it("submits valid shop data and resets the form after success", async () => {
    mockCreateShop.mockResolvedValue({ id: 1 });
    const { container, unmount } = renderCreateShop();

    const nameInput = container.querySelector('input[name="name"]');
    const descriptionInput = container.querySelector('textarea[name="description"]');
    const nifInput = container.querySelector('input[name="nif"]');

    changeField(nameInput, "Loja Trevo");
    changeField(descriptionInput, "Moda circular");
    changeField(nifInput, "123456789");

    await submitForm(container);

    expect(mockCreateShop).toHaveBeenCalledWith({
      name: "Loja Trevo",
      description: "Moda circular",
      nif: "123456789",
    });
    expect(container.textContent).toContain("Loja criada com sucesso");
    expect(nameInput.value).toBe("");
    expect(descriptionInput.value).toBe("");
    expect(nifInput.value).toBe("");

    unmount();
  });
});
