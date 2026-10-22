import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  ZONE_COLORS,
  TOURIST_STATUS_COLORS,
  riskLevel,
  titleCase,
  fmtTime,
} from "../lib/format";

const BENGALURU = [12.95, 77.62];

// Fit the view to the zone polygons once they load.
function FitToZones({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson?.features?.length) return;
    try {
      const bounds = L.geoJSON(geojson).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    } catch {
      /* ignore */
    }
  }, [geojson, map]);
  return null;
}

// Fit the view to route polyline bounds when a new route is selected/planned.
// Avoids resetting during location updates by keying on route endpoints and length.
function FitToRoute({ route, padding = [40, 40] }) {
  const map = useMap();
  const lastRouteKeyRef = useRef(null);

  useEffect(() => {
    if (!route || route.length < 2) return;
    const key = `${route.length}-${route[0][0]},${route[0][1]}-${route[route.length - 1][0]},${route[route.length - 1][1]}`;
    if (lastRouteKeyRef.current === key) return;
    lastRouteKeyRef.current = key;

    try {
      const bounds = L.latLngBounds(route);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding, maxZoom: 16 });
      }
    } catch {
      /* ignore */
    }
  }, [route, padding, map]);

  return null;
}

// Pan to single location marker when placed (if no full route is active).
function FocusLocation({ marker, hasRoute }) {
  const map = useMap();
  const lastKeyRef = useRef(null);

  useEffect(() => {
    if (hasRoute) return;
    if (!marker || marker.lat == null || marker.lon == null) return;
    const key = `${marker.lat.toFixed(4)},${marker.lon.toFixed(4)}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    try {
      map.setView([marker.lat, marker.lon], 14, { animate: true });
    } catch {
      /* ignore */
    }
  }, [marker, hasRoute, map]);

  return null;
}

// Pan to follow a moving point during simulation without resetting zoom.
function Recenter({ center, follow }) {
  const map = useMap();
  useEffect(() => {
    if (follow && center) map.panTo(center, { animate: true, duration: 0.5 });
  }, [center, follow, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({
          lat: +e.latlng.lat.toFixed(4),
          lon: +e.latlng.lng.toFixed(4),
        });
      }
    },
  });
  return null;
}

function zoneStyle(feature) {
  const cat = feature.properties.risk_category;
  const color = ZONE_COLORS[cat] || "#64748b";
  return {
    color,
    weight: 2,
    fillColor: color,
    fillOpacity: feature.properties.restricted ? 0.28 : 0.14,
  };
}

function createOnEachZone(onMapClick) {
  return function onEachZone(feature, layer) {
    const p = feature.properties;
    layer.bindTooltip(
      `${p.name} · ${titleCase(p.risk_category)}${p.restricted ? " · restricted" : ""}`,
      { sticky: true }
    );
    if (onMapClick) {
      layer.on("click", (e) => {
        onMapClick({
          lat: +e.latlng.lat.toFixed(4),
          lon: +e.latlng.lng.toFixed(4),
        });
      });
    }
  };
}

export default function ZoneMap({
  geojson,
  incidents = [],
  marker = null,
  selectedCoord = null,
  height = 460,
  center = BENGALURU,
  zoom = 12,
  fit = false,
  fitRoute = true,
  onIncidentClick,
  onMapClick,
  route = null,
  routeColor = "#2563eb",
  safetyPoints = [],
  follow = false,
  tourists = [],
  onTouristClick,
}) {
  const hasRoute = Boolean(route && route.length >= 2);

  return (
    <div style={{ height }} className="relative w-full rounded-xl overflow-hidden">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fit && <FitToZones geojson={geojson} />}
        {fitRoute && hasRoute && <FitToRoute route={route} />}
        <FocusLocation marker={marker} hasRoute={hasRoute} />
        <Recenter center={center} follow={follow} />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {route && route.length >= 2 && (
          <>
            <Polyline positions={route} pathOptions={{ color: routeColor, weight: 5, opacity: 0.75 }} />
            <CircleMarker
              center={route[0]}
              radius={7}
              pathOptions={{ color: "#065f46", fillColor: "#10b981", fillOpacity: 0.95, weight: 2 }}
            >
              <Popup>
                <div className="text-xs font-semibold text-emerald-800">Route Start</div>
              </Popup>
            </CircleMarker>
            <CircleMarker
              center={route[route.length - 1]}
              radius={7}
              pathOptions={{ color: "#991b1b", fillColor: "#ef4444", fillOpacity: 0.95, weight: 2 }}
            >
              <Popup>
                <div className="text-xs font-semibold text-red-800">Route Destination</div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {safetyPoints
          .filter((p) => p.score != null)
          .map((p, i) => (
            <CircleMarker
              key={`sp-${i}`}
              center={[p.lat, p.lon]}
              radius={5}
              pathOptions={{
                color: riskLevel(p.score).color,
                fillColor: riskLevel(p.score).color,
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-xs">
                  Safety: {riskLevel(p.score).label} ({p.score.toFixed(2)})
                </div>
              </Popup>
            </CircleMarker>
          ))}
        {geojson && (
          <GeoJSON
            key={geojson.features?.length || 0}
            data={geojson}
            style={zoneStyle}
            onEachFeature={createOnEachZone(onMapClick)}
          />
        )}

        {incidents
          .filter((i) => i.location)
          .map((i) => (
            <CircleMarker
              key={i.id}
              center={[i.location.lat, i.location.lon]}
              radius={7}
              pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{titleCase(i.incident_type)}</div>
                  <div>Status: {i.status}</div>
                  <div>{fmtTime(i.detected_at)}</div>
                  {onIncidentClick && (
                    <button
                      onClick={() => onIncidentClick(i.id)}
                      className="mt-1 font-medium text-blue-600 hover:underline"
                    >
                      View details →
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {tourists
          .filter((t) => t.last_position)
          .map((t) => (
            <CircleMarker
              key={t.id}
              center={[t.last_position.lat, t.last_position.lon]}
              radius={8}
              pathOptions={{
                color: "#1e293b",
                weight: 2,
                fillColor: TOURIST_STATUS_COLORS[t.status] || "#3b82f6",
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{t.display_name || "Tourist"}</div>
                  <div>Status: {t.status}</div>
                  {onTouristClick && (
                    <button
                      onClick={() => onTouristClick(t.id)}
                      className="mt-1 font-medium text-blue-600 hover:underline"
                    >
                      View details →
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {marker && (
          <CircleMarker
            center={[marker.lat, marker.lon]}
            radius={9}
            pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9 }}
          >
            <Popup>{marker.label || "Current location"}</Popup>
          </CircleMarker>
        )}

        {selectedCoord && selectedCoord.lat != null && selectedCoord.lon != null && (
          <CircleMarker
            center={[Number(selectedCoord.lat), Number(selectedCoord.lon)]}
            radius={8}
            pathOptions={{
              color: "#0369a1",
              fillColor: "#38bdf8",
              fillOpacity: 0.95,
              weight: 3,
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold text-slate-800">Selected Coordinates</div>
                <div className="font-mono text-slate-600 mt-0.5">
                  {Number(selectedCoord.lat).toFixed(4)}, {Number(selectedCoord.lon).toFixed(4)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Area risk lookup target</div>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
