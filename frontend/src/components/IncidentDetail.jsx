import { useEffect, useRef, useState } from "react";
import { MapPin, Clock, ShieldAlert, ListChecks, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { SEVERITY_STYLES, fmtTime, titleCase } from "../lib/format";
import { Badge, Spinner, Empty } from "./ui";

export default function IncidentDetail({ incidentId, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const isMountedRef = useRef(true);

  async function loadDetail(isBackground = false) {
    if (!incidentId) return;
    if (isBackground) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setErr(null);
    }

    try {
      const d = await api.incident(incidentId);
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

  // Initial load when incidentId changes
  useEffect(() => {
    isMountedRef.current = true;
    setData(null);
    loadDetail(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [incidentId]);

  // Reconcile data when parent dashboard refreshes without closing or resetting the panel
  useEffect(() => {
    if (refreshKey && data) {
      loadDetail(true);
    }
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500" role="status">
        <Spinner />
        <span className="text-xs">Loading incident information…</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
        <p className="font-semibold">Unable to load incident</p>
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

  if (!data) return <Empty>No incident record found.</Empty>;

  const signals = data.details?.signals || [];
  const areaRisk = data.details?.area_risk_score;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-brand-600" aria-hidden="true" />
            <h4 className="text-base font-semibold text-slate-800">
              {titleCase(data.incident_type)}
            </h4>
            <Badge className="bg-slate-100 text-slate-700 ring-slate-300">{data.status}</Badge>
          </div>
          <button
            type="button"
            onClick={() => loadDetail(true)}
            disabled={refreshing}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            aria-label="Refresh incident details"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin text-brand-600" : ""} aria-hidden="true" />
            <span>{refreshing ? "Syncing…" : "Sync"}</span>
          </button>
        </div>

        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" aria-hidden="true" />
            <span>Detected: {fmtTime(data.detected_at)}</span>
          </div>
          {data.location && (
            <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
              <MapPin size={14} className="text-slate-400" aria-hidden="true" />
              <span>{data.location.lat.toFixed(4)}, {data.location.lon.toFixed(4)}</span>
            </div>
          )}
          {areaRisk != null && (
            <div className="text-xs">
              Area-risk score:{" "}
              <span className="font-semibold text-slate-800">{areaRisk.toFixed(3)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Detection signals */}
      <div>
        <SectionLabel icon={ListChecks}>Detection signals</SectionLabel>
        {signals.length === 0 ? (
          <Empty>No automated detection signals recorded.</Empty>
        ) : (
          <div className="space-y-2">
            {signals.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                <Badge className={`${SEVERITY_STYLES[s.severity] || SEVERITY_STYLES.info} shrink-0 mt-0.5`}>
                  {s.severity}
                </Badge>
                <span className="text-slate-700 leading-snug">{s.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advisory alerts */}
      <div>
        <SectionLabel icon={ShieldAlert}>Advisory alerts</SectionLabel>
        {data.alerts.length === 0 ? (
          <Empty>No alerts broadcast for this incident.</Empty>
        ) : (
          <div className="space-y-3">
            {data.alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge className={SEVERITY_STYLES[a.severity]}>{a.severity}</Badge>
                  <span className="text-xs text-slate-500 font-mono">By: {a.created_by}</span>
                </div>
                {a.summary && <p className="text-sm font-medium text-slate-800">{a.summary}</p>}
                {a.recommended_action && (
                  <ul className="mt-2 space-y-1">
                    {a.recommended_action.split("\n").filter(Boolean).map((line, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-600">
                        <span className="text-brand-600" aria-hidden="true">›</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </div>
  );
}
