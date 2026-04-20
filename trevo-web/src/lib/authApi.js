const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload));
  }

  return payload;
}

function extractErrorMessage(payload) {
  if (!payload) {
    return "Ocorreu um erro. Tenta novamente.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  return payload.detail ?? payload.message ?? "Ocorreu um erro. Tenta novamente.";
}

export function requestPasswordReset(email) {
  return request("/api/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function validatePasswordResetToken(token) {
  return request("/api/auth/password-reset/validate", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function confirmPasswordReset(token, newPassword) {
  return request("/api/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}
