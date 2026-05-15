import apiClient from "../lib/apiClient";

export async function getProduct(productId) {
  const { data } = await apiClient.get(`/products/${productId}`);
  return data;
}
