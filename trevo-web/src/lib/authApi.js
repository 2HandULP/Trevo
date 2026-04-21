const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(body?.detail || body?.title || "Request failed");
  }

  return body;
}

export function registerBuyer(payload) {
  return apiRequest("/api/auth/register/buyer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerShopOwner(payload) {
  return apiRequest("/api/auth/register/shop-owner", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchUserProfile(accessToken) {
  return apiRequest("/api/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
