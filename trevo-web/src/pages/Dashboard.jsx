import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { fetchUserProfile } from "../lib/authApi";

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
        const currentUserProfile = await fetchUserProfile(accessToken);
        if (active) {
          setProfile(currentUserProfile);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Não foi possível carregar o perfil");

          if (loadError.status === 401) {
            logout();
            navigate("/login", { replace: true });
          }
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
          <p>Perfil carregado</p>
          <p>Tipo de conta: {profile.role}</p>
          <p>Email: {profile.email}</p>
          <p>Nome: {profile.fullName}</p>
          <p>Estado da conta: {profile.status}</p>
          {profile.shopName && <p>Loja: {profile.shopName}</p>}
          {profile.shopStatus && <p>Estado da loja: {profile.shopStatus}</p>}
        </>
      )}
    </div>
  );
}
