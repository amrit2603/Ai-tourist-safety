import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, LogIn } from "lucide-react";
import { useAuth, homeForRole } from "../lib/auth";
import { Button, Field, Input, Spinner } from "../components/ui";
import Topography from "../components/Topography";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const resp = await login(email.trim(), password);
      nav(homeForRole(resp.role), { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function fillPoliceDemo() {
    setEmail("police@bengaluru.gov.in");
    setPassword("police123");
  }

  return (
    <AuthShell title="Sign in" subtitle="Tourist Safety Control Center">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" labelClassName="text-slate-200">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            className="border-slate-700 bg-slate-800/90 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30"
          />
        </Field>
        <Field label="Password" labelClassName="text-slate-200">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="border-slate-700 bg-slate-800/90 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30"
          />
        </Field>
        {err && (
          <p className="rounded-lg border border-red-800/60 bg-red-950/50 p-2.5 text-xs font-medium text-red-300">
            {err}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full shadow-md">
          {busy ? <Spinner /> : <LogIn size={16} aria-hidden="true" />} Sign in
        </Button>
      </form>

      <button
        type="button"
        onClick={fillPoliceDemo}
        className="mt-3.5 w-full rounded-lg bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-700 transition hover:bg-slate-700/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        Use police demo login
      </button>

      <p className="mt-4 text-center text-xs text-slate-400">
        New tourist?{" "}
        <Link
          to="/signup"
          className="font-medium text-cyan-400 transition hover:text-cyan-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-[#071827] p-4 sm:p-6">
      {/* Decorative Topography WebGL background */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <Topography
          color="#38BDF8"
          lineCount={16}
          lineWidth={0.9}
          elevation={0.65}
          foreground={0.15}
          tilt={38}
          speed={0.08}
          morph={0.05}
          glow={0.25}
          depthOfField={0.25}
          fog={0.5}
          mouseInteraction={false}
          clickEffect="none"
          markers="none"
          glitch={0}
        />
      </div>

      {/* Auth Card Panel */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md my-auto">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600/90 text-white shadow-lg ring-4 ring-brand-500/20 backdrop-blur-xs">
            <ShieldCheck size={24} aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
          <p className="text-sm text-slate-400 max-w-xs">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/85 p-5 sm:p-7 shadow-2xl backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}

