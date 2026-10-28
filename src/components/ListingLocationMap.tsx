"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useT } from "@/components/i18n/LanguageProvider";

type Leaflet = typeof import("leaflet");
type LMap = import("leaflet").Map;
type LTileLayer = import("leaflet").TileLayer;

// Esri World Imagery — free satellite tiles (attribution required, no key).
const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Imagery &copy; Esri, Maxar, Earthstar Geographics";
const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = "&copy; OpenStreetMap contributors";

function pinIcon(L: Leaflet) {
  return L.divIcon({
    className: "",
    html:
      '<div style="transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">' +
      '<svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.7 23.3 0 15 0Z" fill="#e0813f"/>' +
      '<circle cx="15" cy="15" r="6" fill="#fff"/></svg></div>',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function ListingLocationMap({
  latitude,
  longitude,
  pinPrecision,
}: {
  latitude: number;
  longitude: number;
  pinPrecision: string;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const LRef = useRef<Leaflet | null>(null);
  const mapRef = useRef<LMap | null>(null);
  const satRef = useRef<LTileLayer | null>(null);
  const stdRef = useRef<LTileLayer | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"satellite" | "standard">("satellite");
  const t = useT();

  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  // Create the map once (satellite by default — the "detail" upgrade).
  useEffect(() => {
    if (!hasCoords) return;
    let cancelled = false;
    void (async () => {
      const mod = await import("leaflet");
      const L = (mod as unknown as { default?: Leaflet }).default ?? (mod as unknown as Leaflet);
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView([latitude, longitude], 16);
      const sat = L.tileLayer(ESRI_IMAGERY, { maxZoom: 19, attribution: ESRI_ATTR });
      const std = L.tileLayer(OSM, { maxZoom: 19, attribution: OSM_ATTR });
      satRef.current = sat;
      stdRef.current = std;
      sat.addTo(map);
      L.marker([latitude, longitude], { icon: pinIcon(L) }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 150);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        satRef.current = null;
        stdRef.current = null;
      }
    };
  }, [latitude, longitude, hasCoords]);

  // Swap base layer when the toggle changes (imperative only — no setState).
  useEffect(() => {
    const map = mapRef.current;
    const sat = satRef.current;
    const std = stdRef.current;
    if (!ready || !map || !sat || !std) return;
    if (view === "satellite") {
      if (map.hasLayer(std)) map.removeLayer(std);
      if (!map.hasLayer(sat)) sat.addTo(map);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(std)) std.addTo(map);
    }
  }, [view, ready]);

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  if (!hasCoords) {
    return (
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
        No map location was provided for this listing.
      </p>
    );
  }

  const toggleBtn = (v: "satellite" | "standard") =>
    `px-3 py-1.5 text-xs font-semibold transition ${
      view === v ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
    }`;

  return (
    <div>
      <div className="relative isolate overflow-hidden rounded-2xl border border-[var(--border)]">
        <div ref={mapEl} className="h-72 w-full bg-[var(--background)]" />
        {/* base-layer toggle (above Leaflet panes) */}
        <div className="absolute left-3 top-3 z-[1000] flex overflow-hidden rounded-full border border-[var(--border)] shadow-sm">
          <button type="button" onClick={() => setView("satellite")} className={toggleBtn("satellite")}>
            {t("listing.satellite")}
          </button>
          <button type="button" onClick={() => setView("standard")} className={toggleBtn("standard")}>
            {t("listing.mapView")}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">
          Pin precision: {pinPrecision.replace(/_/g, " ").toLowerCase()} · {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
        <a
          href={directions}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {t("listing.getDirections")}
        </a>
      </div>
    </div>
  );
}
