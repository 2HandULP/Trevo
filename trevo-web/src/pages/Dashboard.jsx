import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchBuyerProfile } from "../lib/authApi";

export default function Dashboard() {
  const { accessToken, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const buyerProfile = await fetchBuyerProfile(accessToken);
        if (active) {
          setProfile(buyerProfile);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Não foi possível carregar o perfil");
          logout();
          navigate("/login", { replace: true });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [accessToken, logout, navigate]);

  return (
    <div style={{ color: "black", fontSize: "24px", padding: "20px" }}>
      <h1>Dashboard</h1>
      <p>Autenticado: {isAuthenticated ? "Sim" : "Não"}</p>
      {isLoading && <p>A carregar perfil...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {profile && (
        <>
          <p>Buyer profile loaded</p>
          <p>Email: {profile.email}</p>
          <p>Nome: {profile.fullName}</p>
          <p>Estado: {profile.status}</p>
        </>
      )}
    </div>
  );
}
