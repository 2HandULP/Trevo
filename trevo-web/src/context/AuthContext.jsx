import { createContext, useContext, useEffect, useState } from "react";
import { loginUser, registerBuyer, registerShopOwner } from "../lib/authApi";

const AuthContext = createContext();
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    setAccessToken(storedAccessToken);
    setRefreshToken(storedRefreshToken);
  }, []);

  function persistSession(tokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
  }

  function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setRefreshToken(null);
  }

  async function login(credentials) {
    const tokens = await loginUser(credentials);
    persistSession(tokens);
    return tokens;
  }

  async function register(payload) {
    if (payload.type === "owner") {
      return registerShopOwner({
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName,
        phone: payload.phone || null,
        shopName: payload.shopName,
        nif: payload.nif,
      });
    }

    return registerBuyer({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      phone: payload.phone || null,
    });
  }

  const value = {
    accessToken,
    refreshToken,
    token: accessToken,
    isAuthenticated: !!accessToken,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
