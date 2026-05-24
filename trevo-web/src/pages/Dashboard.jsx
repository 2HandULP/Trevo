import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchUserProfile } from "../lib/authApi";

export default function Dashboard() {
  const { t } = useTranslation("common");
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
          setError(loadError.message || t("loadProfileFailed", { ns: "profile" }));

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
  }, [accessToken, logout, navigate, t]);

  return (
    <div style={{ color: "black", fontSize: "24px", padding: "20px" }}>
      <h1>{t("dashboard")}</h1>
      <p>{t("authenticated")}: {isAuthenticated ? t("yes") : t("no")}</p>
      {isLoading && <p>{t("loadingProfile")}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {profile && (
        <>
          <p>{t("profileLoaded")}</p>
          <p>{t("accountType")}: {profile.role}</p>
          <p>Email: {profile.email}</p>
          <p>{t("name")}: {profile.fullName}</p>
          <p>{t("accountStatus")}: {profile.status}</p>
          {profile.shopName && <p>{t("shop")}: {profile.shopName}</p>}
          {profile.shopStatus && <p>{t("shopStatus")}: {profile.shopStatus}</p>}
        </>
      )}
    </div>
  );
}
