import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-white/80">
      <div className="site-container flex flex-col gap-4 py-8 text-sm text-[var(--color-muted)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black text-[var(--color-ink)]">Trevo</p>
          <p className="mt-1">Moda circular com ferramentas para compradores e lojas.</p>
        </div>
        <nav className="flex flex-wrap gap-4 font-bold" aria-label="Navegacao secundaria">
          <Link className="hover:text-[var(--color-primary)]" to="/products">
            Produtos
          </Link>
          <Link className="hover:text-[var(--color-primary)]" to="/login">
            Entrar
          </Link>
          <Link className="hover:text-[var(--color-primary)]" to="/register">
            Criar conta
          </Link>
        </nav>
      </div>
    </footer>
  );
}
