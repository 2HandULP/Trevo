import apiClient from "../lib/apiClient";

export async function getShopDashboard() {
  const { data } = await apiClient.get("/shops/me/dashboard");
  return data;
}
