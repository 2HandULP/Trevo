import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
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
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("authenticated")}
        title={t("dashboard")}
        description={`${t("authenticated")}: ${isAuthenticated ? t("yes") : t("no")}`}
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-3" aria-live="polite">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />
          ))}
        </div>
      )}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {profile && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label={t("accountType")} value={profile.role} detail={t("profileLoaded")} />
            <MetricCard label={t("accountStatus")} value={profile.status} />
            <MetricCard label={t("role")} value={profile.shopName || profile.fullName || t("noRole")} />
          </div>

          <section className="page-card mt-8 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-[var(--color-muted)]">{t("name")}</p>
                <h2 className="mt-1 text-2xl font-black">{profile.fullName}</h2>
                <p className="mt-2 text-[var(--color-muted)]">Email: {profile.email}</p>
              </div>
              <StatusBadge status={profile.status}>{profile.status}</StatusBadge>
            </div>
            {(profile.shopName || profile.shopStatus) && (
              <div className="mt-6 grid gap-4 border-t border-black/10 pt-6 sm:grid-cols-2">
                {profile.shopName && <MetricCard label={t("shop")} value={profile.shopName} />}
                {profile.shopStatus && (
                  <MetricCard label={t("shopStatus")} value={profile.shopStatus} />
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
