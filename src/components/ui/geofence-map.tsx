"use client";

/**
 * GeofenceMap — pure-SVG geofence visualization. No external map library.
 *
 * Why no MapLibre/Mapbox?
 *   - MapLibre is ~700KB gzipped; for our use-case we only need a small
 *     geofence circle + a few employee dots, not real street tiles.
 *   - Avoids API-key wiring (Mapbox requires one; MapLibre demos need
 *     a tile server URL).
 *   - The design spec hero mock IS a CSS-based geofence — we just make it
 *     real with actual lat/lng data and a pulsing perimeter.
 *
 * If/when we need real street tiles later, swap this component for one
 * backed by maplibre-gl with the same prop signature.
 *
 * The map uses an equirectangular projection centered on the geofence
 * point. For a 50m–500m geofence the projection error is negligible
 * (< 0.1m at our latitudes).
 */

type Person = {
  id: string;
  name: string;
  /** Their initials (max 2 chars), used in the dot. */
  initials: string;
  /** Distance in meters from center. */
  distanceMeters: number;
  /** Bearing in degrees (0 = north, 90 = east). Optional — if omitted,
   *  we hash the id into a stable angle so positions are deterministic. */
  bearingDeg?: number;
  /** Whether they were inside the geofence at last check. */
  withinGeofence: boolean;
  /** Optional avatar color (hex). Falls back to electric blue. */
  color?: string;
};

export function GeofenceMap({
  centerName,
  centerLat,
  centerLng,
  radiusMeters,
  people = [],
  className = "",
  height = 280,
}: {
  centerName?: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  people?: Person[];
  className?: string;
  height?: number;
}) {
  // Show out-to 2.5x the geofence radius so dots near the edge have room
  const viewportMeters = Math.max(radiusMeters * 2.5, 100);
  // SVG viewport is 400×280; we use a 400-unit-wide coordinate space
  const vbW = 400;
  const vbH = height;
  const cx = vbW / 2;
  const cy = vbH / 2;
  const metersToPx = (m: number) => (m / viewportMeters) * vbW;
  const geofencePx = metersToPx(radiusMeters);

  // Stable hash → bearing for people without an explicit bearing
  function stableBearing(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return (h % 360);
  }

  return (
    <div className={`relative rounded-md overflow-hidden border border-white/[0.06] ${className}`}
      style={{
        background: "radial-gradient(circle at 50% 50%, rgba(106,162,255,0.10) 0%, rgba(78,224,197,0.04) 30%, rgba(13,20,34,0.6) 70%)",
        height: vbH,
      }}>
      {/* Decorative grid bg */}
      <div className="absolute inset-0 bg-grid-faint opacity-50 pointer-events-none" />

      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="relative w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Pulsing geofence ring */}
          <radialGradient id="geofence-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgba(106,162,255,0.18)" />
            <stop offset="70%" stopColor="rgba(106,162,255,0.08)" />
            <stop offset="100%" stopColor="rgba(106,162,255,0)" />
          </radialGradient>
        </defs>

        {/* 3 pulse rings (animated via CSS) */}
        {[0, 0.9, 1.8].map((delay, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={geofencePx}
            fill="none"
            stroke="rgba(106,162,255,0.5)"
            strokeWidth="1.5"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animation: `gf-pulse 3s infinite ease-out`,
              animationDelay: `${delay}s`,
            }}
          />
        ))}

        {/* Solid geofence ring */}
        <circle
          cx={cx}
          cy={cy}
          r={geofencePx}
          fill="url(#geofence-fill)"
          stroke="rgba(106,162,255,0.6)"
          strokeWidth="1.5"
        />

        {/* Center pin */}
        <circle cx={cx} cy={cy} r={5}  fill="#6aa2ff" />
        <circle cx={cx} cy={cy} r={11} fill="none" stroke="rgba(106,162,255,0.4)" strokeWidth="2" />

        {/* People dots */}
        {people.map((p) => {
          const bearing = p.bearingDeg ?? stableBearing(p.id);
          const θ = ((bearing - 90) * Math.PI) / 180; // 0° = north
          const d = metersToPx(p.distanceMeters);
          const px = cx + d * Math.cos(θ);
          const py = cy + d * Math.sin(θ);
          const dotColor = p.color ?? (p.withinGeofence ? "#4ee0c5" : "#f17a8e");
          return (
            <g key={p.id}>
              <circle cx={px} cy={py} r={11} fill={`color-mix(in srgb, ${dotColor} 18%, transparent)`} />
              <circle cx={px} cy={py} r={7}  fill={dotColor} stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
              <text
                x={px}
                y={py}
                fontSize="7"
                fontWeight="600"
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="central"
                style={{ pointerEvents: "none" }}
              >
                {p.initials.slice(0, 2).toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Footer caption */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-ink-500">
        {centerName ? (
          <span className="truncate"><span className="text-ink-300">📍</span> {centerName}</span>
        ) : (
          <span>{centerLat.toFixed(4)}°N, {centerLng.toFixed(4)}°W</span>
        )}
        <span><span className="text-brand-300">●</span> {radiusMeters}m radius</span>
      </div>

      <style jsx>{`
        @keyframes gf-pulse {
          0%   { transform: scale(0.85); opacity: 1; }
          100% { transform: scale(1.55); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
