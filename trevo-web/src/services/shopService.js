import { publicClient } from "../lib/apiClient";

export async function getShopProfile(shopId) {
  const { data } = await publicClient.get(`/shops/${shopId}`);
  return data;
}
