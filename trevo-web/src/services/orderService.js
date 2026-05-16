import apiClient from "../lib/apiClient";

export async function getBuyerOrders(params) {
  const { data } = await apiClient.get("/buyer/orders", { params });
  return data;
}

export async function getBuyerOrder(orderId) {
  const { data } = await apiClient.get(`/buyer/orders/${orderId}`);
  return data;
}

export async function cancelBuyerOrder(orderId) {
  const { data } = await apiClient.post(`/buyer/orders/${orderId}/cancel`);
  return data;
}
