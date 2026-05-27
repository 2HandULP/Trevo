import apiClient from "../lib/apiClient";

export async function getTryOnUsage(productId) {
  const { data } = await apiClient.get(`/buyer/try-on/usage/${productId}`);
  return data;
}

export async function generateTryOn(productId, modelIdentifier) {
  const { data } = await apiClient.post("/buyer/try-on", {
    productId,
    modelIdentifier,
  });
  return data;
}

export async function generatePersonalizedTryOn(productId, photos) {
  const formData = new FormData();
  formData.append("productId", productId);
  photos.forEach((file) => {
    formData.append("photos", file);
  });

  const { data } = await apiClient.post("/buyer/try-on/personalized", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
