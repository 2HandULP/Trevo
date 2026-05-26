import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { normalizeRole, ROLES } from "../lib/roles";

function navLinkClass({ isActive }) {
  return `site-nav-link${isActive ? " active" : ""}`;
}

export default function SiteHeader() {
  const { isAuthenticated, role, logout } = useAuth();
  const normalizedRole = normalizeRole(role);

  return (
    <header className="site-header">
      <div className="site-container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary)] text-lg font-black text-white">
            T
          </span>
          <span>
            <span className="block text-xl font-black leading-none text-[var(--color-ink)]">
              Trevo
            </span>
            <span className="block text-xs font-bold uppercase text-[var(--color-muted)]">
              Marketplace circular
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2" aria-label="Navegacao principal">
          <NavLink to="/products" className={navLinkClass}>
            Produtos
          </NavLink>

          {isAuthenticated && normalizedRole === ROLES.BUYER && (
            <>
              <NavLink to="/cart" className={navLinkClass}>
                Carrinho
              </NavLink>
              <NavLink to="/orders" className={navLinkClass}>
                Encomendas
              </NavLink>
              <NavLink to="/pro" className={navLinkClass}>
                Pro
              </NavLink>
            </>
          )}

          {isAuthenticated && normalizedRole === ROLES.SHOP_OWNER && (
            <>
              <NavLink to="/shop/dashboard" className={navLinkClass}>
                Loja
              </NavLink>
              <NavLink to="/shop/orders" className={navLinkClass}>
                Vendas
              </NavLink>
              <NavLink to="/products/new" className={navLinkClass}>
                Novo produto
              </NavLink>
            </>
          )}

          {isAuthenticated && normalizedRole === ROLES.ADMIN && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}

          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                Conta
              </NavLink>
              <button type="button" onClick={logout} className="btn btn-secondary min-h-10 px-4 py-2">
                Sair
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Entrar
              </NavLink>
              <Link to="/register" className="btn btn-primary min-h-10 px-4 py-2">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
