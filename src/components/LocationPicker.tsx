"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Leaflet = typeof import("leaflet");
type LMap = import("leaflet").Map;
type LMarker = import("leaflet").Marker;

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India
const DEFAULT_ZOOM = 5;

// Pull coordinates straight out of a full Google Maps URL (or a pasted
// "lat, lng"). Shortened share links are resolved server-side instead.
function extractCoords(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /^\s*(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})\s*$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

// A themed pin as a divIcon (avoids Leaflet's broken default-image paths).
function pinIcon(L: Leaflet) {
  return L.divIcon({
    className: "",
    html: `<svg viewBox="0 0 24 24" width="32" height="32" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">
      <path d="M12 2c-3.9 0-7 3.1-7 7 0 5 7 13 7 13s7-8 7-13c0-3.9-3.1-7-7-7Z" fill="#e0813f" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="9" r="2.6" fill="#fff"/>
    </svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  });
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  onAddress,
}: {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
  onAddress?: (addr: { state?: string | null; city?: string | null; locality?: string | null }) => void;
}) {
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [manual, setManual] = useState(false);
  const [resolvingAddr, setResolvingAddr] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const mapEl = useRef<HTMLDivElement>(null);
  const LRef = useRef<Leaflet | null>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const onAddressRef = useRef(onAddress);
  const commitRef = useRef<(lat: number, lng: number, recenter?: boolean) => void>(() => {});

  const hasCoords = latitude !== "" && longitude !== "";

  // Keep the latest callbacks without mutating refs during render.
  useEffect(() => {
    onChangeRef.current = onChange;
    onAddressRef.current = onAddress;
  });

  const resolveAddress = useCallback(async (lat: number, lng: number) => {
    setResolvingAddr(true);
    try {
      const res = await fetch(`/api/v1/geo/reverse?lat=${lat}&lng=${lng}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setAddress(json.data.display ?? null);
        onAddressRef.current?.({
          state: json.data.state,
          city: json.data.city,
          locality: json.data.locality,
        });
      }
    } catch {
      // Non-fatal — the pin is still set; user can pick state/city manually.
    } finally {
      setResolvingAddr(false);
    }
  }, []);

  // Set a point (from a map click, drag or geolocation): update the form + address.
  // The marker itself is driven by the [latitude, longitude] sync effect below.
  const commit = useCallback(
    (lat: number, lng: number, recenter = false) => {
      setStatus("idle");
      setMsg(null);
      onChangeRef.current(lat.toFixed(6), lng.toFixed(6));
      if (recenter && mapRef.current) {
        mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15));
      }
      void resolveAddress(lat, lng);
    },
    [resolveAddress],
  );

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mod = await import("leaflet");
      const L = (mod as unknown as { default?: Leaflet }).default ?? (mod as unknown as Leaflet);
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;

      const start: [number, number] = hasCoords
        ? [Number(latitude), Number(longitude)]
        : DEFAULT_CENTER;
      const map = L.map(mapEl.current).setView(start, hasCoords ? 15 : DEFAULT_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      map.on("click", (e) => commitRef.current(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;

      if (hasCoords) {
        const m = L.marker(start, { draggable: true, icon: pinIcon(L) }).addTo(map);
        m.on("dragend", () => {
          const p = m.getLatLng();
          commitRef.current(p.lat, p.lng);
        });
        markerRef.current = m;
        setTimeout(() => {
          if (!cancelled) void resolveAddress(start[0], start[1]);
        }, 0);
      }
      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync with the coordinates (imperative Leaflet only — no setState).
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;
    if (latitude === "" || longitude === "") {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const m = L.marker([lat, lng], { draggable: true, icon: pinIcon(L) }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        commitRef.current(p.lat, p.lng);
      });
      markerRef.current = m;
    }
  }, [latitude, longitude]);

  // Paste a Google Maps link (or "lat, lng") → extract coords locally, or resolve
  // a shortened/place link server-side, then drop the pin + find the address.
  async function handleLink(value: string) {
    setLink(value);
    setMsg(null);
    const v = value.trim();
    if (!v) {
      setStatus("idle");
      return;
    }
    const local = extractCoords(v);
    if (local) {
      commit(local.lat, local.lng, true);
      return;
    }
    if (/^https?:\/\//i.test(v)) {
      setStatus("busy");
      try {
        const res = await fetch(`/api/v1/geo/resolve?url=${encodeURIComponent(v)}`);
        const json = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMsg(json.error?.message ?? "Couldn't read that link.");
          return;
        }
        commit(json.data.lat, json.data.lng, true);
      } catch {
        setStatus("error");
        setMsg("Network error resolving the link.");
      }
    }
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setMsg("Location isn't available on this device/browser.");
      return;
    }
    setStatus("busy");
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => commit(pos.coords.latitude, pos.coords.longitude, true),
      (err) => {
        setStatus("error");
        setMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — allow it or drop the pin on the map."
            : "Couldn't get your location. Drop the pin on the map instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={link}
          onChange={(e) => handleLink(e.target.value)}
          placeholder="Paste a Google Maps link"
          className="input min-w-[200px] flex-1"
        />
        <button type="button" onClick={useCurrentLocation} className="btn-ghost whitespace-nowrap">
          📍 Use my location
        </button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Paste a Maps link, use your location, or tap the map to drop a pin (drag it to fine-tune).
      </p>

      <div
        ref={mapEl}
        className="h-64 w-full overflow-hidden rounded-xl border border-[var(--border)]"
        style={{ background: "var(--accent-soft)" }}
      />

      {status === "busy" && <p className="text-xs text-[var(--muted)]">Finding location…</p>}
      {resolvingAddr && <p className="text-xs text-[var(--muted)]">Reading the address from the pin…</p>}
      {status === "error" && msg && <p className="text-xs text-red-500">{msg}</p>}

      {hasCoords && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-xs">
          {address && <p className="font-medium text-[var(--foreground)]">{address}</p>}
          <p className="mt-0.5 text-[var(--muted)]">
            Pin: {latitude}, {longitude} ·{" "}
            <button
              type="button"
              onClick={() => {
                onChange("", "");
                setAddress(null);
                setLink("");
                setStatus("idle");
              }}
              className="underline"
            >
              clear
            </button>
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setManual((m) => !m)}
        className="self-start text-xs text-[var(--muted)] underline"
      >
        {manual ? "Hide manual entry" : "Enter coordinates manually"}
      </button>
      {manual && (
        <div className="flex gap-2">
          <input
            value={latitude}
            onChange={(e) => onChange(e.target.value, longitude)}
            placeholder="Latitude"
            inputMode="decimal"
            className="input"
          />
          <input
            value={longitude}
            onChange={(e) => onChange(latitude, e.target.value)}
            placeholder="Longitude"
            inputMode="decimal"
            className="input"
          />
        </div>
      )}
    </div>
  );
}
