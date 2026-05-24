import apiClient from "../lib/apiClient";

export async function getTryOnUsage(productId) {
  const { data } = await apiClient.get(`/buyer/try-on/usage/${productId}`);
  return data;
}
