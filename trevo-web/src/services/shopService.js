import apiClient from "../lib/apiClient";

export async function createShop(payload) {
  const { data } = await apiClient.post("/shops", payload);
  return data;
}

export async function getShopDashboard() {
  // TODO: Endpoint GET /shops/me/dashboard depende de implementação backend futura.
  const { data } = await apiClient.get("/shops/me/dashboard");
  return data;
}
