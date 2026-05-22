import apiClient from "../lib/apiClient";

const REQUIRED_PHOTO_COUNT = 3;

export async function uploadBuyerPhotos(files) {
  if (!Array.isArray(files) || files.length !== REQUIRED_PHOTO_COUNT) {
    throw new Error("Seleciona exatamente 3 imagens");
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("photos", file);
  });

  const { data } = await apiClient.post("/buyer/photos", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}
