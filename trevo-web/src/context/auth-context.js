import { createContext, useContext } from "react";

export const AuthContext = createContext();

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("token");
}

export function useAuth() {
  return useContext(AuthContext);
}
