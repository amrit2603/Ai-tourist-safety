import { useEffect, useRef, useState } from "react";
import {
  TriangleAlert,
  BellRing,
  Users,
  Search,
  RefreshCw,
  Newspaper,
  ShieldCheck,
  MousePointerClick,
} from "lucide-react";
import { api } from "../lib/api";
import {
  SEVERITY_STYLES,
  RISK_STYLES,
  TOURIST_STATUS_STYLES,
  riskLevel,
  fmtTime,
  titleCase,
} from "../lib/format";
import { Card, StatCard, Badge, Button, Field, Input, Empty, Spinner } from "../components/ui";
import ZoneMap from "../components/ZoneMap";
import Drawer from "../components/Drawer";
import IncidentDetail from "../components/IncidentDetail";
import TouristDetail from "../components/TouristDetail";

const INCIDENT_STATUS_STYLES = {
  open: "bg-amber-100 text-amber-800 ring-amber-300",
  acknowledged: "bg-blue-100 text-blue-800 ring-blue-300",
  resolved: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  dismissed: "bg-slate-100 text-slate-700 ring-slate-300",
};

export default function Dashboard() {
  const [geojson, setGeojson] = useState(null);
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tourists, setTourists] = useState([]);
  const [riskEvents, setRiskEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTouristId, setSelectedTouristId] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter state for incidents: "all" | "open" | "resolved"
  const [incidentFilter, setIncidentFilter] = useState("all");

  // Map-based risk lookup state
  const [lookupCoords, setLookupCoords] = useState({ lat: "12.9770", lon: "77.5720" });
  const [coordSource, setCoordSource] = useState("default"); // "map" | "manual" | "default"

  const isMountedRef = useRef(true);

  async function load() {
    try {
      const [gj, zs, inc, al, ts, re] = await Promise.all([
        api.zonesGeojson(),
        api.zones(),
        api.incidents({ limit: 100 }),
        api.alerts({ limit: 50 }),
        api.policeTourists(),
        api.riskEvents({ limit: 50 }),
      ]);
      if (!isMountedRef.current) return;
      setGeojson(gj);
      setZones(zs);
      setIncidents(inc);
      setAlerts(al);
      setTourists(ts);
      setRiskEvents(re);
      setUpdatedAt(new Date());
      setRefreshKey((k) => k + 1);
      setError(null);
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(e.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    load();
    const t = setInterval(load, 15000);
    return () => {
      isMountedRef.current = false;
      clearInterval(t);
    };
  }, []);

  function handleMapClick(coords) {
    setLookupCoords({
      lat: coords.lat.toFixed(4),
      lon: coords.lon.toFixed(4),
    });
    setCoordSource("map");
  }

  function handleCoordsChange(newCoords, source = "manual") {
    setLookupCoords(newCoords);
    setCoordSource(source);
  }

  const openIncidents = incidents.filter(
    (i) => i.status === "open" || i.status === "acknowledged"
  ).length;
  const resolvedIncidents = incidents.filter(
    (i) => i.status === "resolved" || i.status === "dismissed"
  ).length;
  const flagged = tourists.filter((t) => t.status === "panic" || t.status === "alert").length;

  // Filter incidents list based on active filter tab
  const filteredIncidents = incidents.filter((i) => {
    if (incidentFilter === "open") return i.status === "open" || i.status === "acknowledged";
    if (incidentFilter === "resolved") return i.status === "resolved" || i.status === "dismissed";
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-pulse">
          <div>
            <div className="h-6 w-48 rounded bg-slate-200 mb-2" />
            <div className="h-4 w-72 rounded bg-slate-100" />
          </div>
          <div className="h-9 w-24 rounded bg-slate-200" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white p-5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="h-[460px] rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2 animate-pulse flex flex-col items-center justify-center gap-2 text-slate-400">
            <Spinner />
            <span className="text-xs">Initializing geospatial control center…</span>
          </div>
          <div className="space-y-6">
            <div className="h-48 rounded-xl border border-slate-200 bg-white animate-pulse" />
            <div className="h-48 rounded-xl border border-slate-200 bg-white animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Police Dashboard</h1>
          <p className="text-sm text-slate-500">
            Live safety zones, incident response, and risk intelligence for Bengaluru.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-slate-500 font-medium">
              Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <Button
            variant="ghost"
            onClick={load}
            aria-label="Refresh dashboard data from server"
            className="focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <RefreshCw size={15} aria-hidden="true" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <div className="flex items-center gap-2">
            <TriangleAlert size={18} className="text-red-600 shrink-0" aria-hidden="true" />
            <span>{error} — please verify backend service availability.</span>
          </div>
          <Button
            variant="ghost"
            onClick={load}
            className="text-xs py-1 px-3 border-red-300 hover:bg-red-100 text-red-900"
          >
            Retry connection
          </Button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Tourists tracked" value={tourists.length} tone="brand" />
        <StatCard icon={TriangleAlert} label="Flagged tourists" value={flagged} tone="red" />
        <StatCard icon={BellRing} label="Open incidents" value={openIncidents} tone="amber" />
        <StatCard icon={Newspaper} label="Risk events" value={riskEvents.length} tone="slate" />
      </div>

      {/* Main Grid: Interactive Map + Sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card
          title="Live incident & zone map"
          action={
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <MousePointerClick size={14} className="text-brand-600" aria-hidden="true" />
              <span>Click map to inspect coordinates</span>
            </span>
          }
          className="xl:col-span-2"
        >
          <ZoneMap
            geojson={geojson}
            incidents={incidents}
            tourists={tourists}
            selectedCoord={{ lat: Number(lookupCoords.lat), lon: Number(lookupCoords.lon) }}
            onMapClick={handleMapClick}
            height={460}
            fit
            onIncidentClick={setSelectedId}
            onTouristClick={setSelectedTouristId}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
            <div className="flex flex-wrap gap-3">
              <Legend color="#10b981" label="Low Risk" />
              <Legend color="#f59e0b" label="Moderate Risk" />
              <Legend color="#f97316" label="High Risk / Alert" dot />
              <Legend color="#ef4444" label="Restricted / SOS" dot />
              <Legend color="#dc2626" label="Incident" dot />
              <Legend color="#0284c7" label="Lookup Pin" dot />
            </div>
            <span className="text-[11px] text-slate-400">Clicking map coordinates updates the risk lookup</span>
          </div>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <RiskLookup
            coords={lookupCoords}
            onCoordsChange={handleCoordsChange}
            coordSource={coordSource}
          />

          <Card title="Active tourists">
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {tourists.length === 0 ? (
                <Empty>No tourists currently active.</Empty>
              ) : (
                tourists.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTouristId(t.id)}
                    aria-label={`View details for tourist ${t.display_name || "Unnamed"}, status ${t.status}`}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="truncate text-sm font-medium text-slate-700">
                      {t.display_name || "Unnamed tourist"}
                      {t.zone_name ? <span className="font-normal text-slate-400"> · {t.zone_name}</span> : ""}
                    </span>
                    <Badge className={TOURIST_STATUS_STYLES[t.status]}>{t.status}</Badge>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card title="Configured safety zones">
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {zones.length === 0 ? (
                <Empty>No zones configured.</Empty>
              ) : (
                zones.map((z) => (
                  <div key={z.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-none">
                    <span className="text-sm font-medium text-slate-700">{z.name}</span>
                    <Badge className={RISK_STYLES[z.risk_category]}>
                      {z.restricted ? "restricted" : z.risk_category}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Incidents and Alerts Section */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card
          title="Recent incidents"
          action={
            <div
              className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5"
              role="tablist"
              aria-label="Incident status filters"
            >
              {[
                { id: "all", label: "All", count: incidents.length },
                { id: "open", label: "Open", count: openIncidents },
                { id: "resolved", label: "Resolved", count: resolvedIncidents },
              ].map((tab) => {
                const isActive = incidentFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setIncidentFilter(tab.id)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      isActive
                        ? "bg-white text-slate-800 shadow-sm font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive ? "bg-slate-100 text-slate-800 font-semibold" : "bg-slate-200/70 text-slate-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          }
        >
          {filteredIncidents.length === 0 ? (
            <Empty>
              {incidentFilter === "all"
                ? "No incidents recorded yet."
                : incidentFilter === "open"
                ? "No open incidents at this time."
                : "No resolved incidents found."}
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[340px]" role="table" aria-label="Incidents table">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th scope="col" className="pb-2.5">Type</th>
                    <th scope="col" className="pb-2.5">Status</th>
                    <th scope="col" className="pb-2.5">Detected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIncidents.slice(0, 8).map((i) => (
                    <tr
                      key={i.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelectedId(i.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(i.id);
                        }
                      }}
                      aria-label={`View details for ${titleCase(i.incident_type)} incident, status ${i.status}, detected ${fmtTime(i.detected_at)}. Press Enter to open.`}
                      className="cursor-pointer transition hover:bg-slate-50 focus:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                    >
                      <td className="py-2.5 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              i.status === "open"
                                ? "bg-amber-500 animate-pulse"
                                : i.status === "resolved"
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                            aria-hidden="true"
                          />
                          <span>{titleCase(i.incident_type)}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Badge className={INCIDENT_STATUS_STYLES[i.status] || "bg-slate-100 text-slate-700 ring-slate-300"}>
                          {i.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-xs text-slate-500 font-mono">{fmtTime(i.detected_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Recent alerts">
          {alerts.length === 0 ? (
            <Empty>No alerts broadcast yet.</Empty>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto">
              {alerts.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.incident_id)}
                  aria-label={`View incident details for alert: ${a.summary || "Alert"}`}
                  className="block w-full rounded-lg border border-slate-100 p-3 text-left transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <Badge className={SEVERITY_STYLES[a.severity]}>{a.severity}</Badge>
                    <span className="text-xs text-slate-400 font-mono">{fmtTime(a.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-snug">{a.summary || "—"}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Risk events (crime & hazards) — police only">
        {riskEvents.length === 0 ? (
          <Empty>No risk events recorded yet.</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {riskEvents.slice(0, 8).map((e) => (
              <div key={e.id} className="rounded-lg border border-slate-100 bg-slate-50/40 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <Badge className="bg-slate-100 text-slate-700 ring-slate-300">
                    {titleCase(e.event_type)}
                  </Badge>
                  <span className="text-xs text-slate-500 font-mono">
                    {Math.round(e.confidence * 100)}% conf · {fmtTime(e.event_time)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                {e.description && (
                  <p className="mt-0.5 text-xs text-slate-600 leading-normal">{e.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Fresh Incident Detail Drawer with live refresh reconciliation */}
      <Drawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Incident detail"
      >
        {selectedId && <IncidentDetail incidentId={selectedId} refreshKey={refreshKey} />}
      </Drawer>

      {/* Fresh Tourist Detail Drawer with live refresh reconciliation */}
      <Drawer
        open={!!selectedTouristId}
        onClose={() => setSelectedTouristId(null)}
        title="Tourist detail"
      >
        {selectedTouristId && <TouristDetail touristId={selectedTouristId} refreshKey={refreshKey} />}
      </Drawer>
    </div>
  );
}

function Legend({ color, label, dot }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span
        className={dot ? "h-2.5 w-2.5 rounded-full" : "h-2 w-3.5 rounded-sm"}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

function RiskLookup({ coords, onCoordsChange, coordSource }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function checkRisk(latVal = coords.lat, lonVal = coords.lon) {
    const nLat = parseFloat(latVal);
    const nLon = parseFloat(lonVal);
    if (isNaN(nLat) || isNaN(nLon)) {
      setErr("Please enter valid numeric latitude and longitude.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const [risk, zone] = await Promise.all([
        api.areaRisk(nLat, nLon),
        api.zoneAt(nLat, nLon),
      ]);
      setResult({ score: risk.risk_score, zone: zone.zone });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // When coordinates update via map click, auto-calculate risk
  const lastMapCoordsRef = useRef(null);
  useEffect(() => {
    if (coordSource === "map") {
      const key = `${coords.lat},${coords.lon}`;
      if (lastMapCoordsRef.current !== key) {
        lastMapCoordsRef.current = key;
        checkRisk(coords.lat, coords.lon);
      }
    }
  }, [coords.lat, coords.lon, coordSource]);

  const lvl = result ? riskLevel(result.score) : null;

  return (
    <Card title="Area-risk lookup">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Selected Coordinates</span>
          {coordSource === "map" ? (
            <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 font-medium text-sky-800 ring-1 ring-inset ring-sky-200">
              Map clicked
            </span>
          ) : (
            <span className="text-slate-400">Manual coordinates</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <Input
              value={coords.lat}
              onChange={(e) => onCoordsChange({ ...coords, lat: e.target.value }, "manual")}
              aria-label="Target Latitude"
              placeholder="12.9770"
            />
          </Field>
          <Field label="Longitude">
            <Input
              value={coords.lon}
              onChange={(e) => onCoordsChange({ ...coords, lon: e.target.value }, "manual")}
              aria-label="Target Longitude"
              placeholder="77.5720"
            />
          </Field>
        </div>

        <Button
          className="w-full"
          onClick={() => checkRisk(coords.lat, coords.lon)}
          disabled={busy}
          aria-label="Check safety risk for target coordinates"
        >
          {busy ? <Spinner /> : <Search size={16} aria-hidden="true" />} Check risk
        </Button>

        {err && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {err}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Calculated Risk Score</span>
              <span className="font-semibold" style={{ color: lvl.color }}>
                {result.score == null ? "n/a" : result.score.toFixed(3)} · {lvl.label}
              </span>
            </div>
            <div
              role="meter"
              aria-valuenow={Math.round((result.score || 0) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Area risk level"
              aria-valuetext={lvl.label}
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/60"
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(4, (result.score || 0) * 100))}%`,
                  backgroundColor: lvl.color,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Governing Zone:</span>
              <span className="font-medium text-slate-700">{result.zone ? result.zone.name : "Unzoned area"}</span>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 leading-normal">
          Click any location on the map to populate coordinates and inspect real-time risk.
        </p>
      </div>
    </Card>
  );
}
