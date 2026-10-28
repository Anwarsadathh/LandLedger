"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { ListingCard } from "@/components/ListingCard";
import type { PublicListing } from "@/server/modules/listings/dto";
import { formatArea } from "@/lib/format";

type Leaflet = typeof import("leaflet");
type LMap = import("leaflet").Map;
type LMarker = import("leaflet").Marker;
type LCluster = import("leaflet").MarkerClusterGroup;

const INDIA_CENTER: [number, number] = [22.5, 79.0];
const INDIA_ZOOM = 5;

function compactPrice(min: number): string {
  if (min >= 10000000) return `₹${(min / 10000000).toFixed(min % 10000000 === 0 ? 0 : 1)} Cr`;
  if (min >= 100000) return `₹${Math.round(min / 100000)} L`;
  if (min >= 1000) return `₹${Math.round(min / 1000)}K`;
  return `₹${min}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function priceIcon(L: Leaflet, label: string, selected: boolean) {
  const bg = selected ? "#1b1813" : "#e0813f";
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};color:#fff;font-weight:700;font-size:11px;line-height:16px;padding:3px 9px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4);border:1.5px solid #fff;transform:translate(-50%,-100%)">${escapeHtml(label)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function MapExplorer({ items }: { items: PublicListing[] }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const LRef = useRef<Leaflet | null>(null);
  const mapRef = useRef<LMap | null>(null);
  const clusterRef = useRef<LCluster | null>(null);
  const markersRef = useRef<Record<string, LMarker>>({});
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mod = await import("leaflet");
      const L = (mod as unknown as { default?: Leaflet }).default ?? (mod as unknown as Leaflet);
      await import("leaflet.markercluster");
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current).setView(INDIA_CENTER, INDIA_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48 });
      map.addLayer(cluster);
      mapRef.current = map;
      clusterRef.current = cluster;
      setTimeout(() => map.invalidateSize(), 150);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  // (Re)plot markers whenever the listings change.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!ready || !L || !map || !cluster) return;

    cluster.clearLayers();
    markersRef.current = {};
    const pts: [number, number][] = [];

    for (const it of items) {
      const lat = it.location.latitude;
      const lng = it.location.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const m = L.marker([lat, lng], { icon: priceIcon(L, compactPrice(it.price.min), false) });
      m.bindPopup(
        `<a href="/listings/${it.slug}" style="font-weight:600;color:#1b1813">${escapeHtml(it.title)}</a>` +
          `<br/><span style="color:#8a8075">${compactPrice(it.price.min)} · ${escapeHtml(formatArea(it.area))}</span>`,
      );
      m.on("click", () => {
        setSelectedId(it.id);
        document.getElementById(`map-card-${it.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      cluster.addLayer(m);
      markersRef.current[it.id] = m;
      pts.push([lat, lng]);
    }

    if (pts.length > 0) {
      map.fitBounds(pts, { padding: [48, 48], maxZoom: 13 });
    } else {
      map.setView(INDIA_CENTER, INDIA_ZOOM);
    }
  }, [items, ready]);

  function focusListing(id: string) {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    const m = markersRef.current[id];
    setSelectedId(id);
    if (map && m) {
      const ll = m.getLatLng();
      map.setView(ll, Math.max(map.getZoom(), 13), { animate: true });
      // zoomToShowLayer reveals a marker hidden inside a cluster, then opens it.
      cluster?.zoomToShowLayer(m, () => m.openPopup());
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div
        ref={mapEl}
        className="h-[52vh] w-full overflow-hidden rounded-2xl border border-[var(--border)] lg:sticky lg:top-24 lg:h-[72vh]"
        style={{ background: "var(--accent-soft)" }}
      />

      <div className="grid max-h-[72vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="col-span-2 card border-dashed p-10 text-center text-sm text-[var(--muted)]">
            No listings match your filters yet.
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              id={`map-card-${it.id}`}
              onMouseEnter={() => focusListing(it.id)}
              className={`rounded-2xl transition ${selectedId === it.id ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              <ListingCard listing={it} compact />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
