export default function DashboardHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 rounded-lg bg-[linear-gradient(135deg,#0f5132,#17201b)] p-6 text-white shadow-[var(--shadow-soft)] sm:p-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && (
          <p className="text-sm font-black uppercase text-white/70">{eyebrow}</p>
        )}
        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl leading-7 text-white/78">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
