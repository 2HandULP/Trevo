import apiClient from "../lib/apiClient";

export async function createPaymentIntent(orderId) {
  const { data } = await apiClient.post("/payments/stripe/payment-intents", {
    orderId,
  });
  return data;
}
