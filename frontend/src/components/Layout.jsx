import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  UserRound,
  ShieldCheck,
  Activity,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

// Nav items per role — each role only sees its own area.
const NAV_BY_ROLE = {
  police: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
  tourist: [{ to: "/portal", label: "My Safety", icon: UserRound }],
};

function HealthDot({ light = false }) {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      api
        .health()
        .then((d) => alive && setOk(d.status === "ok"))
        .catch(() => alive && setOk(false));
    check();
    const t = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const color = ok == null ? "bg-slate-400" : ok ? "bg-emerald-500" : "bg-red-500";
  return (
    <div
      className={`flex items-center gap-2 text-xs font-medium ${
        light ? "text-slate-600" : "text-slate-300"
      }`}
      role="status"
      aria-live="polite"
    >
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      <span>{ok == null ? "checking…" : ok ? "API healthy" : "API offline"}</span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = NAV_BY_ROLE[user?.role] || [];

  // Lock body scroll and listen for Escape key when mobile nav drawer is open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col bg-slate-900 text-slate-300">
        <div className="flex items-center gap-2.5 px-6 py-5 text-white">
          <ShieldCheck className="text-brand-500" size={24} aria-hidden="true" />
          <div className="leading-tight">
            <div className="font-semibold text-sm tracking-wide">Tourist Safety</div>
            <div className="text-xs text-slate-400">
              {user?.role === "police" ? "Control Center" : "My Safety"}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main Navigation">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  isActive
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-slate-800 px-6 py-4">
          <HealthDot />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-slate-200">
                {user?.email}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                {user?.role}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-over Navigation Drawer */}
      <div
        id="mobile-navigation"
        className={`fixed inset-0 z-[1050] md:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className={`absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Drawer Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-slate-900 text-slate-300 shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="text-brand-500" size={22} aria-hidden="true" />
              <div className="leading-tight">
                <div className="font-semibold text-sm">Tourist Safety</div>
                <div className="text-xs text-slate-400">
                  {user?.role === "police" ? "Control Center" : "My Safety"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-3" aria-label="Mobile Navigation">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    isActive
                      ? "bg-brand-600 text-white shadow-xs"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="space-y-3 border-t border-slate-800 p-5">
            <HealthDot />
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-200">
                  {user?.email}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  {user?.role}
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
              <ShieldCheck className="text-brand-600" size={18} aria-hidden="true" />
              <span className="truncate">Tourist Safety</span>
            </div>
          </div>
          <HealthDot light />
        </header>

        {/* Desktop Header Bar */}
        <header className="hidden md:flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-3 shrink-0">
          <Activity size={18} className="text-brand-600" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-700">
            AI-Orchestrated Tourist Safety & Incident Intelligence
          </span>
        </header>

        {/* Scrollable Viewport */}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

