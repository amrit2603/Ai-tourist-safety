import { useEffect, useRef, useState } from "react";
import { UserRound, MapPin, Phone, Activity, ShieldAlert, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { TOURIST_STATUS_STYLES, riskLevel, fmtTime, titleCase } from "../lib/format";
import { Badge, Spinner, Empty } from "./ui";

export default function TouristDetail({ touristId, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const isMountedRef = useRef(true);

  async function loadDetail(isBackground = false) {
    if (!touristId) return;
    if (isBackground) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setErr(null);
    }

    try {
      const d = await api.policeTourist(touristId);
      if (!isMountedRef.current) return;
      setData(d);
      setErr(null);
    } catch (e) {
      if (!isMountedRef.current) return;
      if (!isBackground) {
        setErr(e.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  // Initial load when touristId changes
  useEffect(() => {
    isMountedRef.current = true;
    setData(null);
    loadDetail(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [touristId]);

  // Reconcile data when parent dashboard refreshes
  useEffect(() => {
    if (refreshKey && data) {
      loadDetail(true);
    }
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500" role="status">
        <Spinner />
        <span className="text-xs">Loading tourist record…</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
        <p className="font-semibold">Unable to load tourist record</p>
        <p className="text-xs mt-1">{err}</p>
        <button
          type="button"
          onClick={() => loadDetail(false)}
          className="mt-2 text-xs font-semibold text-red-800 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return <Empty>No tourist record found.</Empty>;

  const lvl = riskLevel(data.area_risk_score);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserRound size={18} className="text-brand-600" aria-hidden="true" />
            <h4 className="text-base font-semibold text-slate-800">
              {data.display_name || "Unnamed tourist"}
            </h4>
            <Badge className={TOURIST_STATUS_STYLES[data.status]}>{data.status}</Badge>
          </div>
          <button
            type="button"
            onClick={() => loadDetail(true)}
            disabled={refreshing}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            aria-label="Refresh tourist details"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin text-brand-600" : ""} aria-hidden="true" />
            <span>{refreshing ? "Syncing…" : "Sync"}</span>
          </button>
        </div>

        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <div>Nationality: <span className="font-medium text-slate-800">{data.nationality || "Not specified"}</span></div>
          {data.emergency_contact && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-slate-400" aria-hidden="true" />
              <span>{data.emergency_contact}</span>
            </div>
          )}
          <div className="text-xs text-slate-500">
            DPDP Location Consent: <span className="font-medium text-slate-700">{data.consent_given ? "Granted" : "Withheld / Revoked"}</span>
          </div>
          {data.last_position && (
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
              <MapPin size={14} className="text-slate-400" aria-hidden="true" />
              <span>{data.last_position.lat.toFixed(4)}, {data.last_position.lon.toFixed(4)}</span>
              {data.zone_name ? <span className="font-sans text-slate-500">· {data.zone_name}</span> : ""}
            </div>
          )}
          {data.area_risk_score != null && (
            <div className="text-xs">
              Area risk:{" "}
              <span className="font-semibold" style={{ color: lvl.color }}>
                {data.area_risk_score.toFixed(3)} · {lvl.label}
              </span>
            </div>
          )}
        </div>
      </div>

      <Section icon={ShieldAlert} label={`Associated Incidents (${data.incidents.length})`}>
        {data.incidents.length === 0 ? (
          <Empty>No flagged incidents for this tourist.</Empty>
        ) : (
          <div className="space-y-2">
            {data.incidents.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{titleCase(i.incident_type)}</span>
                <span className="text-xs text-slate-500">{fmtTime(i.detected_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Activity} label={`Recent Activity (${data.recent_pings.length} pings)`}>
        {data.recent_pings.length === 0 ? (
          <Empty>No location pings recorded.</Empty>
        ) : (
          <div className="max-h-48 space-y-1 overflow-auto rounded-lg border border-slate-100 p-2">
            {data.recent_pings.map((p, i) => (
              <div key={i} className="flex items-center justify-between font-mono text-xs text-slate-600 py-0.5">
                <span>{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</span>
                <span className="font-sans text-[11px] text-slate-400">{fmtTime(p.recorded_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {Icon && <Icon size={14} aria-hidden="true" />} {label}
      </div>
      {children}
    </div>
  );
}
