export default function PurchaseSummary({ title, rows = [], totalLabel, total, children }) {
  return (
    <aside className="page-card h-fit p-5 lg:sticky lg:top-28">
      <h2 className="text-xl font-black">{title}</h2>
      {rows.length > 0 && (
        <dl className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-[var(--color-muted)]">{row.label}</dt>
              <dd className="font-black">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-5 border-t border-black/10 pt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-black uppercase text-[var(--color-muted)]">{totalLabel}</p>
          <p className="text-2xl font-black text-[var(--color-primary-dark)]">{total}</p>
        </div>
      </div>
      {children && <div className="mt-5">{children}</div>}
    </aside>
  );
}
