"use client";

import { useState } from "react";

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
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [resolvingAddr, setResolvingAddr] = useState(false);

  const hasCoords = latitude !== "" && longitude !== "";

  // Reverse-geocode the pin to auto-fill state / city / locality.
  async function resolveAddress(lat: number, lng: number) {
    if (!onAddress) return;
    setResolvingAddr(true);
    try {
      const res = await fetch(`/api/v1/geo/reverse?lat=${lat}&lng=${lng}`);
      const json = await res.json();
      if (res.ok && json.data) onAddress(json.data);
    } catch {
      // Non-fatal — coordinates are still set; user can pick state/city manually.
    } finally {
      setResolvingAddr(false);
    }
  }

  function apply(lat: number, lng: number) {
    onChange(lat.toFixed(6), lng.toFixed(6));
    setStatus("idle");
    setMsg(null);
    void resolveAddress(lat, lng);
  }

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
      apply(local.lat, local.lng);
      return;
    }
    // Looks like a shortened/place link — resolve it on the server.
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
        apply(json.data.lat, json.data.lng);
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
      (pos) => apply(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setStatus("error");
        setMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — allow it or paste a Maps link."
            : "Couldn't get your location. Try again or paste a Maps link.",
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
          className="input min-w-[220px] flex-1"
        />
        <button type="button" onClick={useCurrentLocation} className="btn-ghost whitespace-nowrap">
          📍 Use my location
        </button>
      </div>

      {status === "busy" && <p className="text-xs text-[var(--muted)]">Finding location…</p>}
      {resolvingAddr && <p className="text-xs text-[var(--muted)]">Filling state &amp; city from the pin…</p>}
      {status === "error" && msg && <p className="text-xs text-red-500">{msg}</p>}

      {hasCoords && status !== "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-green-600">
            📍 Set: {latitude}, {longitude} ·{" "}
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              open in Maps ↗
            </a>{" "}
            ·{" "}
            <button
              type="button"
              onClick={() => {
                onChange("", "");
                setLink("");
                setStatus("idle");
              }}
              className="underline"
            >
              clear
            </button>
          </p>
          <iframe
            title="Location preview"
            src={`https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
            className="h-48 w-full rounded-lg border border-[var(--border)]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
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

      <p className="text-xs text-[var(--muted)]">
        In Google Maps, tap <strong>Share</strong> → <strong>Copy link</strong> and paste it here, or use your
        current location.
      </p>
    </div>
  );
}
