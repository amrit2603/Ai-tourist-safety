import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Search,
  LocateFixed,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { api } from "../lib/api";

// An accessible combobox for choosing a place: curated suggestions + free-text
// geocoding + reliable geolocation with loading, error & retry states.
export default function PlacePicker({
  label,
  value,
  onChange,
  curated = [],
  allowMyLocation = false,
  placeholder = "Search a place…",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const boxRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced geocode search for free text.
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .placeSearch(query.trim())
        .then((d) => setResults(d.results || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 450);
    return () => clearTimeout(t);
  }, [query]);

  const q = query.trim().toLowerCase();
  const filteredCurated = q
    ? curated.filter((p) => p.name.toLowerCase().includes(q))
    : curated;

  // Build the list of selectable items for keyboard navigation index mapping
  const selectableItems = [];
  if (allowMyLocation && !q) {
    selectableItems.push({ type: "my_location", name: "Use my current location" });
  }
  filteredCurated.forEach((p) => {
    selectableItems.push({ type: "curated", ...p });
  });
  results.forEach((r) => {
    selectableItems.push({ type: "result", ...r });
  });

  // Reset activeIndex when query or list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [query, results.length]);

  function pick(p) {
    onChange({ name: p.name, lat: p.lat, lon: p.lon });
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    setGeoError(null);
    triggerRef.current?.focus();
  }

  function handleSelectIndex(index) {
    if (index < 0 || index >= selectableItems.length) return;
    const item = selectableItems[index];
    if (item.type === "my_location") {
      useMyLocation();
    } else {
      pick(item);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setGeoError(null);
        pick({
          name: "My current location",
          lat: +pos.coords.latitude.toFixed(5),
          lon: +pos.coords.longitude.toFixed(5),
        });
      },
      (err) => {
        setGeoLoading(false);
        let msg = "Could not obtain your location.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser settings.";
        } else if (err.code === 2) {
          msg = "Location position unavailable. Please check your GPS signal.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please retry.";
        }
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      if (selectableItems.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % selectableItems.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (selectableItems.length === 0) return;
      setActiveIndex((prev) => (prev - 1 + selectableItems.length) % selectableItems.length);
      return;
    }

    if (e.key === "Enter") {
      if (open && activeIndex >= 0 && activeIndex < selectableItems.length) {
        e.preventDefault();
        handleSelectIndex(activeIndex);
      }
    }
  }

  // Auto-scroll the active option into view inside the list
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  let currentItemTracker = 0;

  return (
    <div className="relative" ref={boxRef}>
      {label && (
        <label
          id={`${label.replace(/\s+/g, "-").toLowerCase()}-label`}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${label.replace(/\s+/g, "-").toLowerCase()}-label` : undefined}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-500/30 focus-visible:outline-none"
      >
        <span className={value ? "flex items-center gap-2 text-slate-800 font-medium truncate" : "text-slate-400"}>
          {value && <MapPin size={15} className="text-brand-600 shrink-0" aria-hidden="true" />}
          <span className="truncate">{value ? value.name : placeholder}</span>
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label || placeholder}
          className="absolute z-[1200] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {/* Search Input Bar */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 bg-slate-50/50">
            <Search size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type place name or address…"
              aria-label="Search place name or address"
              className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search query"
                className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded p-0.5"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Dropdown Options List */}
          <div
            ref={listRef}
            id="place-listbox"
            role="listbox"
            aria-label={label || "Places list"}
            className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-100"
          >
            {/* Geolocation Trigger */}
            {allowMyLocation && !q && (() => {
              const myLocIndex = currentItemTracker++;
              const isSelected = activeIndex === myLocIndex;
              return (
                <div className="p-1">
                  <button
                    type="button"
                    role="option"
                    data-index={myLocIndex}
                    aria-selected={isSelected}
                    onClick={useMyLocation}
                    disabled={geoLoading}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      isSelected
                        ? "bg-brand-100 text-brand-900 ring-1 ring-inset ring-brand-300"
                        : "text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {geoLoading ? (
                        <Loader2 size={15} className="animate-spin text-brand-600" aria-hidden="true" />
                      ) : (
                        <LocateFixed size={15} className="text-brand-600" aria-hidden="true" />
                      )}
                      <span>{geoLoading ? "Detecting current location…" : "Use my current location"}</span>
                    </span>
                  </button>

                  {/* Geolocation Error Feedback with Retry Action */}
                  {geoError && (
                    <div className="mt-1 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="leading-snug">{geoError}</p>
                        <button
                          type="button"
                          onClick={useMyLocation}
                          className="mt-1.5 inline-flex items-center gap-1 font-semibold text-amber-800 hover:underline"
                        >
                          <RotateCcw size={11} aria-hidden="true" /> Retry location
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Curated Popular Places */}
            {filteredCurated.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  Popular places
                </div>
                {filteredCurated.map((p) => {
                  const itemIndex = currentItemTracker++;
                  const isSelected = activeIndex === itemIndex;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      role="option"
                      data-index={itemIndex}
                      aria-selected={isSelected}
                      onClick={() => pick(p)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-brand-50 text-brand-900 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {p.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Geocode Search Results */}
            {results.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  Search results
                </div>
                {results.map((r, i) => {
                  const itemIndex = currentItemTracker++;
                  const isSelected = activeIndex === itemIndex;
                  return (
                    <button
                      key={`${r.name}-${i}`}
                      type="button"
                      role="option"
                      data-index={itemIndex}
                      aria-selected={isSelected}
                      onClick={() => pick(r)}
                      className={`block w-full px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-brand-50 text-brand-900 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium text-slate-800">{r.name}</div>
                      {r.full_name && (
                        <div className="truncate text-xs text-slate-500">{r.full_name}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Feedback States */}
            {q && !searching && filteredCurated.length === 0 && results.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No matching places found. Try typing a street or landmark name.
              </div>
            )}
            {searching && (
              <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-slate-500">
                <Loader2 size={15} className="animate-spin text-brand-600" aria-hidden="true" />
                <span>Searching places…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

