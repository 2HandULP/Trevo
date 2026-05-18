import apiClient from "../lib/apiClient";

export async function createReview(shopId, payload) {
  const { data } = await apiClient.post(`/buyer/reviews/shops/${shopId}`, payload);
  return data;
}
