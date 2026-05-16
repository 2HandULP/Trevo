import apiClient from "../lib/apiClient";

export async function getCart() {
  const { data } = await apiClient.get("/buyer/cart");
  return data;
}
