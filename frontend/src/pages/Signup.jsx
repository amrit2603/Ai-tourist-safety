import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth, homeForRole } from "../lib/auth";
import { Button, Field, Input, Spinner } from "../components/ui";
import { AuthShell } from "./Login";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    nationality: "",
    emergency_contact: "",
    consent_given: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.consent_given) {
      setErr("Consent is required to use safety monitoring.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const resp = await signup({
        email: form.email.trim(),
        password: form.password,
        display_name: form.display_name || null,
        nationality: form.nationality || null,
        emergency_contact: form.emergency_contact || null,
        consent_given: form.consent_given,
        consent_purpose: "safety_monitoring",
      });
      nav(homeForRole(resp.role), { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const inputDarkClass =
    "border-slate-700 bg-slate-800/90 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/30";

  return (
    <AuthShell title="Create your account" subtitle="Tourist registration (with consent)">
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Email" labelClassName="text-slate-200">
          <Input
            type="email"
            value={form.email}
            onChange={set("email")}
            required
            className={inputDarkClass}
            placeholder="tourist@example.com"
          />
        </Field>
        <Field label="Password" hint="At least 6 characters" labelClassName="text-slate-200">
          <Input
            type="password"
            value={form.password}
            onChange={set("password")}
            required
            className={inputDarkClass}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Name" labelClassName="text-slate-200">
          <Input
            value={form.display_name}
            onChange={set("display_name")}
            placeholder="Aarav Sharma"
            className={inputDarkClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nationality" labelClassName="text-slate-200">
            <Input
              value={form.nationality}
              onChange={set("nationality")}
              placeholder="IN"
              className={inputDarkClass}
            />
          </Field>
          <Field label="Emergency contact" labelClassName="text-slate-200">
            <Input
              value={form.emergency_contact}
              onChange={set("emergency_contact")}
              placeholder="+91-…"
              className={inputDarkClass}
            />
          </Field>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-300 transition hover:bg-slate-800/80">
          <input
            type="checkbox"
            checked={form.consent_given}
            onChange={(e) => setForm({ ...form, consent_given: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded accent-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          />
          <span>
            I consent to processing my location for <strong className="text-white font-medium">safety monitoring</strong> (DPDP Act).
          </span>
        </label>
        {err && (
          <p className="rounded-lg border border-red-800/60 bg-red-950/50 p-2.5 text-xs font-medium text-red-300">
            {err}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full shadow-md">
          {busy ? <Spinner /> : <UserPlus size={16} aria-hidden="true" />} Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-cyan-400 transition hover:text-cyan-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

