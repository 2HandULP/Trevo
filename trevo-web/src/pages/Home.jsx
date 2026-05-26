import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero.png";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { t } = useTranslation("common");
  const { isAuthenticated, role, logout } = useAuth();

  return (
    <main>
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0f5132_0%,#17201b_48%,#c77d2b_120%)] text-white">
        <div className="site-container grid min-h-[calc(100vh-5rem)] items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
          <div className="max-w-2xl">
            <span className="badge bg-white/14 text-white ring-1 ring-white/20">
              {t("homeHeroEyebrow")}
            </span>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {t("homeHeroTitle")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/82">
              {t("homeHeroDescription")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn bg-white text-[var(--color-primary-dark)] shadow-xl hover:bg-[var(--color-primary-soft)]">
                {t("exploreProducts")}
              </Link>
              <Link to={isAuthenticated ? "/dashboard" : "/register"} className="btn border border-white/30 bg-white/10 text-white hover:bg-white/16">
                {isAuthenticated ? t("goToDashboard") : t("createAccount")}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-lg border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur">
              <img
                src={heroImage}
                alt="Trevo marketplace"
                className="aspect-[4/5] w-full rounded-md object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
              />
            </div>
            <div className="absolute -bottom-5 left-5 right-5 grid gap-3 rounded-lg border border-white/20 bg-white/92 p-4 text-[var(--color-ink)] shadow-2xl sm:grid-cols-3">
              <div>
                <p className="text-2xl font-black">360</p>
                <p className="text-xs font-bold text-[var(--color-muted)]">{t("homeStatProducts")}</p>
              </div>
              <div>
                <p className="text-2xl font-black">3</p>
                <p className="text-xs font-bold text-[var(--color-muted)]">{t("homeStatCheckout")}</p>
              </div>
              <div>
                <p className="text-2xl font-black">24/7</p>
                <p className="text-xs font-bold text-[var(--color-muted)]">{t("homeStatOwners")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [t("homeBuyerCardTitle"), t("homeBuyerCardText")],
            [t("homeShopCardTitle"), t("homeShopCardText")],
            [t("homeTrustCardTitle"), t("homeTrustCardText")],
          ].map(([title, text]) => (
            <article key={title} className="data-card transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
              <div className="mb-5 h-2 w-16 rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]" />
              <h2 className="text-xl font-black">{title}</h2>
              <p className="mt-3 leading-7 text-[var(--color-muted)]">{text}</p>
            </article>
          ))}
        </div>

        <aside className="surface-panel mt-8 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[var(--color-muted)]">{t("sessionStatus")}</p>
            <p className="mt-1 text-lg font-black">
              {t("authenticated")}: {isAuthenticated ? t("yes") : t("no")}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {t("role")}: {role || t("noRole")}
            </p>
          </div>
          {isAuthenticated ? (
            <button type="button" onClick={logout} className="btn btn-secondary">
              {t("logout")}
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary">
              {t("premiumAccess")}
            </Link>
          )}
        </aside>
      </section>
    </main>
  );
}
