// Small reusable UI primitives — clean, modern, no purple.

export function Card({ title, action, children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}>
        {Icon && <Icon size={20} aria-hidden="true" />}
      </div>
      <div>
        <div className="text-2xl font-semibold text-slate-800">{value}</div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </div>
      </div>
    </div>
  );
}

export function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 disabled:bg-brand-300",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300",
    ghost:
      "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-brand-500",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className = "", labelClassName = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className={`mb-1 block text-sm font-medium ${labelClassName || "text-slate-700"}`}>
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus-visible:outline-none ${
        className ||
        "border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30"
      }`}
      {...props}
    />
  );
}

export function Spinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div className="py-8 text-center text-sm text-slate-500">{children}</div>
  );
}
