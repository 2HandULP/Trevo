export default function MetricCard({ label, value, detail }) {
  return (
    <article className="data-card">
      <p className="text-sm font-black uppercase text-[var(--color-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-black text-[var(--color-primary-dark)]">{value}</p>
      {detail && <p className="mt-2 text-sm text-[var(--color-muted)]">{detail}</p>}
    </article>
  );
}
