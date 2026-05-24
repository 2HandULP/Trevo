import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { t } = useTranslation("common");
  const { isAuthenticated, role, logout } = useAuth();

  return (
    <div style={{ padding: "20px", color: "black" }}>
      <h1>{t("home")}</h1>
      <p>{t("authenticated")}: {isAuthenticated ? t("yes") : t("no")}</p>
      <p>{t("role")}: {role || t("noRole")}</p>
      <button onClick={logout}>{t("logout")}</button>
    </div>
  );
}
