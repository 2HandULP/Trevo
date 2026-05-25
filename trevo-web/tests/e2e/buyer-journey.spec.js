import { expect, test } from "@playwright/test";
import {
  testCart,
  testOrderDetail,
  testOrdersPage,
  testProductDetail,
  testProducts,
  testOrders,
} from "./fixtures/buyer-data.js";
import {
  mockAddToCart,
  mockCheckout,
  mockGetCart,
  mockGetOrderDetail,
  mockGetOrders,
  mockLogin,
  mockProductDetail,
  mockProductSearch,
  mockRegisterBuyer,
  mockUserProfile,
} from "./helpers/api-mocks.js";

test.describe("Buyer Journey — Golden Path", () => {
  test("Register → Search → Add to Cart → Checkout → View Order", async ({ page }) => {
    // --- Register ---
    await mockRegisterBuyer(page);
    await page.goto("/register");
    await page.getByPlaceholder("Nome").fill("Buyer E2E");
    await page.getByPlaceholder("Email").fill(`buyer-${Date.now()}@example.com`);
    await page.getByPlaceholder("Password").fill("Secret123!");
    await page.getByPlaceholder("Telefone (opcional)").fill("912345678");
    await page.getByRole("button", { name: "Registar" }).click();

    await expect(page).toHaveURL(/\/login$/);

    // --- Login ---
    await mockLogin(page);
    await mockUserProfile(page);
    await page.getByPlaceholder("Email").fill("buyer-e2e@example.com");
    await page.getByPlaceholder("Password").fill("Secret123!");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Perfil carregado")).toBeVisible();

    // --- Search Products ---
    await mockProductSearch(page, testProducts);
    await page.goto("/products");
    await page.getByLabel("Pesquisar produtos").fill("vestido");
    // The search is debounced — wait for products to appear
    await expect(page.getByText("Vestido Floral")).toBeVisible();
    await expect(page.getByText("49.99 EUR")).toBeVisible();

    // --- View Product Detail ---
    await mockProductDetail(page, testProductDetail);
    await page.getByRole("link", { name: "Ver produto" }).first().click();

    await expect(page.getByRole("heading", { name: "Vestido Floral" })).toBeVisible();
    await expect(page.getByText("TrevoStyle").first()).toBeVisible();
    await expect(page.getByText("Algodao 100%")).toBeVisible();

    // --- Select Variant & Add to Cart ---
    await mockAddToCart(page);
    await page.getByRole("button", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "Vermelho", exact: true }).click();
    await expect(page.getByText("5 em stock")).toBeVisible();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
    await expect(page.getByText("Produto adicionado ao carrinho.")).toBeVisible();

    // --- View Cart ---
    await mockGetCart(page, testCart);
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Carrinho" })).toBeVisible();
    await expect(page.getByText("Loja TrevoStyle")).toBeVisible();
    await expect(page.getByText("Vestido Floral")).toBeVisible();
    await expect(page.getByText("Total geral:")).toBeVisible();

    // --- Checkout with MB WAY ---
    await mockGetCart(page, testCart);
    await mockCheckout(page, testOrders);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("Resumo da encomenda")).toBeVisible();

    await page.locator("#paymentMethod").selectOption("MBWAY");
    await page.locator("#mbWayPhone").fill("912345678");
    await page.getByRole("button", { name: "Iniciar MB WAY" }).click();
    await expect(page.getByText("Pedido MB WAY iniciado para o número 912345678")).toBeVisible();

    // --- View Order in History ---
    await mockGetOrders(page, testOrdersPage);
    await mockGetOrderDetail(page, testOrderDetail);
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "Historico de encomendas" })).toBeVisible();
    await expect(page.getByText("Order #501")).toBeVisible();
    await expect(page.getByText("Criada")).toBeVisible();

    // Click order to see detail
    await page.getByText("Order #501").click();
    await expect(page.getByText("Vestido Floral")).toBeVisible();
  });
});
