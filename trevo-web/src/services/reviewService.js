import { publicClient } from "../lib/apiClient";

export async function getShopReviews(shopId, params) {
  const { data } = await publicClient.get(`/shops/${shopId}/reviews`, { params });
  return data;
}
