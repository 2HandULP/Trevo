import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  const { t } = useTranslation("common");

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-2xl page-card p-8 text-center sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl font-black text-[var(--color-danger)]">
          !
        </span>
        <p className="mt-6 text-sm font-black uppercase text-[var(--color-muted)]">
          {t("unauthorized")}
        </p>
        <h1 className="mt-3 text-4xl font-black">{t("unauthorizedTitle")}</h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-[var(--color-muted)]">
          {t("unauthorizedDescription")}
        </p>
        <Link to="/" className="btn btn-primary mt-8">
          {t("backHome")}
        </Link>
      </section>
    </main>
  );
}
