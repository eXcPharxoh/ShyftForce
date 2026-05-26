"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type GeoSite = { id: string; name: string; lat: number; lng: number; radius: number };
export type GeoPunch = { lat: number; lng: number; inside: boolean; label?: string };

/**
 * Reusable Leaflet map (OpenStreetMap tiles — no API key). Renders work sites
 * with their geofence circle and, optionally, clock-in punches colored green
 * (inside the fence) / amber (outside). Used on the dashboard, attendance audit
 * view, platform overview, and the marketing showcase.
 *
 * Leaflet touches `window`, so we import it dynamically inside useEffect — the
 * component is safe to render from server components (it just renders an empty
 * div during SSR, then builds the map on the client). We use CircleMarker /
 * Circle (vector) to avoid Leaflet's bundler-broken default marker images.
 */
export function GeoMap({
  sites,
  punches = [],
  height = 320,
  interactive = true,
  className = "",
}: {
  sites: GeoSite[];
  punches?: GeoPunch[];
  height?: number;
  interactive?: boolean;
  className?: string;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const sitesKey = JSON.stringify(sites);
  const punchesKey = JSON.stringify(punches);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current) return;

      // (Re)create the map fresh on data change.
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const map = L.map(elRef.current, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      let hasPoint = false;

      for (const s of sites) {
        if (s.lat == null || s.lng == null) continue;
        hasPoint = true;
        // Geofence radius circle
        const circle = L.circle([s.lat, s.lng], {
          radius: s.radius || 100,
          color: "#3a6fd8",
          weight: 1.5,
          fillColor: "#3a6fd8",
          fillOpacity: 0.08,
        }).addTo(map);
        // Site centre
        L.circleMarker([s.lat, s.lng], {
          radius: 6,
          color: "#fff",
          weight: 2,
          fillColor: "#3a6fd8",
          fillOpacity: 1,
        }).addTo(map).bindPopup(`<b>${escapeHtml(s.name)}</b><br/>Geofence: ${Math.round(s.radius || 100)}m`);
        bounds.extend(circle.getBounds());
      }

      for (const p of punches) {
        if (p.lat == null || p.lng == null) continue;
        hasPoint = true;
        L.circleMarker([p.lat, p.lng], {
          radius: 5,
          color: "#fff",
          weight: 1,
          fillColor: p.inside ? "#10b981" : "#f59e0b",
          fillOpacity: 0.95,
        }).addTo(map).bindPopup(
          `${p.inside ? "✓ Inside geofence" : "⚠ Outside geofence"}${p.label ? `<br/>${escapeHtml(p.label)}` : ""}`,
        );
        bounds.extend([p.lat, p.lng]);
      }

      if (hasPoint && bounds.isValid()) {
        map.fitBounds(bounds.pad(0.25), { maxZoom: 16 });
      } else {
        // No data — centre on a neutral world view.
        map.setView([39.5, -98.35], 3);
      }

      // Leaflet sometimes lays out before the container has its final size.
      setTimeout(() => { if (!cancelled) map.invalidateSize(); }, 80);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [sitesKey, punchesKey, interactive]);

  const empty = sites.length === 0 && punches.length === 0;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-white/[0.08] ${className}`} style={{ height }}>
      <div ref={elRef} style={{ height: "100%", width: "100%" }} className="z-0" />
      {empty && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-ink-400 pointer-events-none bg-ink-950/30">
          No location data yet
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
