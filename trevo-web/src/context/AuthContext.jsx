import { useState } from "react";
import { AuthContext, getStoredToken } from "./auth-context";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);

  function login(newToken) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  }

  function logout() {
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
