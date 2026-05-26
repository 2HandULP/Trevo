const toneClasses = {
  success: "bg-green-50 text-green-800 ring-green-200",
  warning: "bg-yellow-50 text-yellow-900 ring-yellow-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
  neutral: "bg-[var(--color-subtle)] text-[var(--color-muted)] ring-black/10",
};

function toneFromStatus(status) {
  if (["ACTIVE", "DELIVERED", "RELEASED", "CONFIRMED"].includes(status)) {
    return "success";
  }

  if (["PENDING", "PENDING_PAYMENT", "PLACED", "SHIPPED"].includes(status)) {
    return "warning";
  }

  if (["SUSPENDED", "CANCELLED", "RETURNED"].includes(status)) {
    return "danger";
  }

  return "neutral";
}

export default function StatusBadge({ children, status, tone }) {
  const resolvedTone = tone || toneFromStatus(status);

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${toneClasses[resolvedTone]}`}>
      {children}
    </span>
  );
}
