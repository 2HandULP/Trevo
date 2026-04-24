import { useState } from "react";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  function login(newToken) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  }

  async function logout() {
    const current = localStorage.getItem("token");
    if (current) {
      try {
        await fetch("/api/auth/sessions/invalidate", {
          method: "POST",
          headers: { Authorization: `Bearer ${current}` },
        });
      } catch {
        // best-effort: clear client state regardless
      }
    }
    localStorage.removeItem("token");
    setToken(null);
  }

  function register(newToken) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  }

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
