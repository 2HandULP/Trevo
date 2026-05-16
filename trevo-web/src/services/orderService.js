import apiClient from "../lib/apiClient";

export async function checkoutOrder(paymentMethod) {
  const { data } = await apiClient.post("/buyer/orders/checkout", {
    paymentMethod,
  });
  return data;
}
