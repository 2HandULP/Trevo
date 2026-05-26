import { useTranslation } from "react-i18next";
import DashboardHeader from "../components/DashboardHeader";

export default function Admin() {
  const { t } = useTranslation("common");

  return (
    <main className="page-shell">
      <DashboardHeader
        eyebrow={t("admin")}
        title={t("admin")}
        description="Area de administracao da plataforma Trevo."
      />
      <section className="page-card p-6">
        <p className="text-[var(--color-muted)]">{t("admin")}</p>
      </section>
    </main>
  );
}
