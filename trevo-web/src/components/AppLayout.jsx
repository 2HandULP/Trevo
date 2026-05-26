import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <SiteHeader />
      <div className="app-content">{children}</div>
      <SiteFooter />
    </div>
  );
}
