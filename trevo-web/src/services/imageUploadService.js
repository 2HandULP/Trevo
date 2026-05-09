import apiClient from "../lib/apiClient";

export async function uploadImage(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post("/uploads/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) {
        return;
      }

      onProgress(Math.round((event.loaded * 100) / event.total));
    },
  });

  return data.url;
}
