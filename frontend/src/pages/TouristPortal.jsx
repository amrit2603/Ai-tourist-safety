import { useEffect, useRef, useState } from "react";
import {
  Siren,
  Route as RouteIcon,
  Play,
  Square,
  ShieldCheck,
  TriangleAlert,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { SEVERITY_STYLES, riskLevel, titleCase } from "../lib/format";
import { Card, Badge, Button, Spinner } from "../components/ui";
import ZoneMap from "../components/ZoneMap";
import PlacePicker from "../components/PlacePicker";
import AssistantWidget from "../components/AssistantWidget";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STATUS_TONE = {
  safe: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  warning: "bg-amber-100 text-amber-900 ring-amber-300",
  critical: "bg-red-100 text-red-800 ring-red-300",
  no_data: "bg-slate-100 text-slate-700 ring-slate-300",
};

export default function TouristPortal() {
  const [geojson, setGeojson] = useState(null);
  const [status, setStatus] = useState(null);
  const [trip, setTrip] = useState(null);
  const [places, setPlaces] = useState([]);
  const [start, setStart] = useState(null); // { name, lat, lon }
  const [dest, setDest] = useState(null); // { name, lat, lon }
  const [pos, setPos] = useState(null); // current marker {lat,lon}
  const [busy, setBusy] = useState(null);
  const [deviate, setDeviate] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [err, setErr] = useState(null);
  const [panicFeedback, setPanicFeedback] = useState(null);

  const stopRef = useRef(false);
  const isMountedRef = useRef(true);

  // Safely load current tourist safety status
  async function loadStatus() {
    try {
      const s = await api.myStatus();
      if (!isMountedRef.current) return;
      setStatus(s);
      if (s.last_position) setPos(s.last_position);
    } catch (e) {
      if (isMountedRef.current) setErr(e.message);
    }
  }

  // Component lifecycle mount and unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    stopRef.current = false;

    api.zonesGeojson().then((z) => {
      if (isMountedRef.current) setGeojson(z);
    }).catch(() => {});

    api.places().then((d) => {
      if (isMountedRef.current) setPlaces(d.places || []);
    }).catch(() => {});

    loadStatus();

    return () => {
      // Abort simulation and async operations cleanly
      isMountedRef.current = false;
      stopRef.current = true;
    };
  }, []);

  async function planTrip() {
    if (!start || !dest) {
      setErr("Pick a start and a destination first.");
      return;
    }
    setBusy("plan");
    setErr(null);
    try {
      const t = await api.planTrip({
        start: { lat: Number(start.lat), lon: Number(start.lon) },
        destination: { lat: Number(dest.lat), lon: Number(dest.lon) },
      });
      if (!isMountedRef.current) return;
      setTrip(t);
      setPos({ lat: Number(start.lat), lon: Number(start.lon) });
    } catch (e) {
      if (isMountedRef.current) setErr(e.message);
    } finally {
      if (isMountedRef.current) setBusy(null);
    }
  }

  async function sendPing(lat, lon) {
    if (!isMountedRef.current) return;
    await api.myPing({ location: { lat, lon } });
    if (!isMountedRef.current) return;
    await loadStatus();
  }

  // Emergency SOS dispatch - immediate one-click API trigger without confirmation delays
  async function panic() {
    const p = pos || start;
    if (!p) {
      setErr("Share a location (pick a start point or detect your location) before triggering SOS.");
      return;
    }
    setBusy("panic");
    setErr(null);
    setPanicFeedback(null);
    try {
      await api.myPanic({ location: { lat: Number(p.lat), lon: Number(p.lon) } });
      if (!isMountedRef.current) return;
      setPanicFeedback({
        type: "success",
        msg: "Emergency SOS dispatched to police control with your coordinates.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });
      await loadStatus();
    } catch (e) {
      if (!isMountedRef.current) return;
      setErr(e.message);
      setPanicFeedback({
        type: "error",
        msg: `Emergency SOS dispatch failed: ${e.message}`,
      });
    } finally {
      if (isMountedRef.current) setBusy(null);
    }
  }

  // Robust simulation with duplicate prevention and responsive stop check
  async function simulate() {
    if (!trip?.route?.length) return;
    if (simulating) return; // Guard against duplicate simulation loops

    setSimulating(true);
    stopRef.current = false;
    setErr(null);

    // Sample ~10 points along the route for a snappy demo
    const pts = trip.route;
    const step = Math.max(1, Math.floor(pts.length / 10));
    const sampled = pts.filter((_, i) => i % step === 0);

    try {
      for (let i = 0; i < sampled.length; i++) {
        if (stopRef.current || !isMountedRef.current) break;

        let [lat, lon] = sampled[i];
        if (deviate && i > sampled.length / 2) {
          // Drift progressively north to trigger route-deviation
          lat += 0.0025 * (i - sampled.length / 2);
        }

        if (!isMountedRef.current) break;
        setPos({ lat, lon });

        try {
          await sendPing(lat, lon);
        } catch (pingErr) {
          if (!isMountedRef.current) return;
          console.warn("Simulation ping warning:", pingErr);
        }

        // Interruptible sleep loop: check stopRef and isMountedRef every 50ms
        for (let waited = 0; waited < 900; waited += 50) {
          if (stopRef.current || !isMountedRef.current) break;
          await sleep(50);
        }
      }
    } catch (e) {
      if (isMountedRef.current) setErr(e.message);
    } finally {
      if (isMountedRef.current) {
        setSimulating(false);
      }
    }
  }

  function stopSimulation() {
    stopRef.current = true;
    setSimulating(false);
  }

  // Popular destination chips from curated list
  const quickPicks = places.filter((p) =>
    [
      "Cubbon Park",
      "Lalbagh Botanical Garden",
      "Bangalore Palace",
      "Bannerghatta National Park",
      "MG Road",
    ].includes(p.name)
  );

  const routeColor = trip ? riskLevel(trip.safety.max_score).color : "#2563eb";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My Safety</h1>
        <p className="text-sm text-slate-500">
          Plan a route, view real-time safety assessments, and share your location while traveling.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left column controls */}
        <div className="space-y-6">
          <StatusCard status={status} />

          <Card title="Plan a trip">
            <div className="space-y-3">
              <PlacePicker
                label="Starting point"
                value={start}
                onChange={setStart}
                curated={places}
                allowMyLocation
                placeholder="Where are you now?"
              />
              <PlacePicker
                label="Destination"
                value={dest}
                onChange={setDest}
                curated={places}
                placeholder="Where do you want to go?"
              />

              {quickPicks.length > 0 && (
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Popular destinations
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Popular destinations">
                    {quickPicks.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setDest({ name: p.name, lat: p.lat, lon: p.lon })}
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={planTrip} disabled={busy === "plan"} className="w-full">
                {busy === "plan" ? <Spinner /> : <RouteIcon size={16} />} Plan route
              </Button>

              {trip && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Route safety rating</span>
                    <span className="font-semibold" style={{ color: routeColor }}>
                      {trip.safety.label}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {(trip.distance_m / 1000).toFixed(1)} km · ~{Math.round(trip.duration_s / 60)} min · Source: {trip.source}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Travel & Simulation Controls */}
          <Card title="Live trip simulation">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deviate}
                  onChange={(e) => setDeviate(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-600 focus:ring-brand-500"
                />
                <span>Simulate going off-route</span>
              </label>

              <div>
                {!simulating ? (
                  <Button
                    onClick={simulate}
                    disabled={!trip || busy === "plan"}
                    className="w-full"
                    aria-label="Start route simulation"
                  >
                    <Play size={16} aria-hidden="true" /> Start trip simulation
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={stopSimulation}
                    className="w-full border-slate-300 hover:bg-slate-100"
                    aria-label="Stop route simulation"
                  >
                    <Square size={16} className="text-slate-600" aria-hidden="true" /> Stop simulation
                  </Button>
                )}
              </div>

              {simulating && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  <span>Simulating journey… map view will follow your movement.</span>
                </div>
              )}

              {err && (
                <div role="alert" className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  <TriangleAlert size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{err}</span>
                </div>
              )}

              <p className="text-xs text-slate-500 leading-relaxed">
                "Start trip" streams simulated GPS coordinates along the planned path so the safety engine runs live checks.
              </p>
            </div>
          </Card>

          {/* Dedicated Emergency Assistance (SOS) - Clearly separated from ordinary controls */}
          <Card
            title="Emergency SOS"
            className="border-red-200 bg-gradient-to-b from-red-50/40 to-white"
          >
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                If you are in danger, trigger this SOS button to immediately alert police emergency dispatch with your current coordinates.
              </p>

              <Button
                variant="danger"
                onClick={panic}
                disabled={busy === "panic"}
                className="w-full py-2.5 font-semibold shadow-sm shadow-red-200 hover:shadow"
                aria-label="Trigger immediate emergency SOS alert to police dispatch"
              >
                {busy === "panic" ? (
                  <>
                    <Spinner /> Dispatching emergency SOS…
                  </>
                ) : (
                  <>
                    <Siren size={18} className="animate-pulse" aria-hidden="true" />
                    <span>Trigger Emergency SOS</span>
                  </>
                )}
              </Button>

              {panicFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                    panicFeedback.type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  {panicFeedback.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <AlertOctagon size={16} className="text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-semibold">{panicFeedback.msg}</p>
                    {panicFeedback.time && (
                      <p className="text-[11px] opacity-80 mt-0.5">Dispatched at {panicFeedback.time}</p>
                    )}
                  </div>
                </div>
              )}

              {!pos && !start && (
                <p className="text-[11px] text-slate-500">
                  Tip: Pick a starting location or use GPS so dispatch receives your location.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Map column */}
        <Card title="Interactive safety map" className="xl:col-span-2">
          <ZoneMap
            geojson={geojson}
            route={trip?.route}
            routeColor={routeColor}
            safetyPoints={trip?.safety?.points || []}
            marker={pos}
            center={pos ? [pos.lat, pos.lon] : undefined}
            zoom={13}
            follow={simulating}
            height={580}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true" /> Safe section
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" aria-hidden="true" /> Caution section
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" aria-hidden="true" /> High-risk section
              </span>
            </div>
            <span>You see generalized safety levels — sensitive incident details remain restricted.</span>
          </div>
        </Card>
      </div>

      <AssistantWidget />
    </div>
  );
}

function StatusCard({ status }) {
  if (!status) {
    return (
      <Card title="Current safety status">
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
          <Spinner />
          <span className="text-xs">Loading safety profile…</span>
        </div>
      </Card>
    );
  }

  const tone = STATUS_TONE[status.status] || STATUS_TONE.no_data;
  const lvl = riskLevel(status.area_risk_score);

  // Multi-sensory icons and status descriptors
  const statusMeta = {
    safe: {
      icon: ShieldCheck,
      iconColor: "text-emerald-600",
      label: "Safe",
      desc: "All monitored safety metrics are normal.",
    },
    warning: {
      icon: TriangleAlert,
      iconColor: "text-amber-600",
      label: "Caution",
      desc: "Increased risk or route anomaly detected.",
    },
    critical: {
      icon: AlertOctagon,
      iconColor: "text-red-600",
      label: "Critical",
      desc: "Immediate danger or emergency alert in progress.",
    },
    no_data: {
      icon: HelpCircle,
      iconColor: "text-slate-500",
      label: "No location shared yet",
      desc: "Plan a trip or share your location to activate monitoring.",
    },
  };

  const meta = statusMeta[status.status] || statusMeta.no_data;
  const StatusIcon = meta.icon;

  return (
    <Card title="Current safety status">
      <div className="space-y-4" role="region" aria-label="Tourist safety status summary">
        {/* Main Status Badge & Icon */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusIcon size={20} className={meta.iconColor} aria-hidden="true" />
            <div>
              <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
              <p className="text-xs text-slate-500">{meta.desc}</p>
            </div>
          </div>
          <Badge className={tone}>{status.status.replace("_", " ")}</Badge>
        </div>

        {status.status !== "no_data" && (
          <div className="space-y-3.5 border-t border-slate-100 pt-3">
            {/* Zone Name */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Monitored Zone</span>
              <span className="font-semibold text-slate-700">{status.zone?.name || "Unzoned Area"}</span>
            </div>

            {/* Area Safety Level with ARIA Meter */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-500">Area Safety</span>
                <span className="font-semibold" style={{ color: lvl.color }}>
                  {lvl.label} ({((status.area_risk_score || 0) * 100).toFixed(0)}%)
                </span>
              </div>
              <div
                role="meter"
                aria-valuenow={Math.round((status.area_risk_score || 0) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={lvl.label}
                aria-label="Area safety risk score"
                className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(4, (status.area_risk_score || 0) * 100))}%`,
                    backgroundColor: lvl.color,
                  }}
                />
              </div>
            </div>

            {/* Route Following Status */}
            {status.on_route != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Route Compliance</span>
                <span className={`inline-flex items-center gap-1.5 font-medium ${
                  status.on_route ? "text-emerald-700" : "text-amber-800 font-semibold"
                }`}>
                  {status.on_route ? (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" />
                      <span>On planned route</span>
                    </>
                  ) : (
                    <>
                      <TriangleAlert size={15} className="text-amber-600" aria-hidden="true" />
                      <span>Off route by {Math.round(status.deviation_m)} m</span>
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Active Safety Warnings */}
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active safety alerts
              </div>
              {status.warnings.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50/60 p-2 text-xs font-medium text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>All clear — no safety alerts reported in this vicinity.</span>
                </div>
              ) : (
                <ul role="list" className="space-y-1.5" aria-label="Active safety warnings">
                  {status.warnings.map((w, i) => (
                    <li
                      key={i}
                      role="listitem"
                      className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-xs"
                    >
                      <Badge className={`${SEVERITY_STYLES[w.severity] || SEVERITY_STYLES.info} shrink-0 mt-0.5`}>
                        {w.severity}
                      </Badge>
                      <span className="text-slate-700 leading-tight">{w.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
