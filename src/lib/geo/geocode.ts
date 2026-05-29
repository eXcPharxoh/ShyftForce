// Free server-side geocoding via OpenStreetMap's Nominatim.
// No API key required. Polite usage requires a User-Agent and ≤1 req/sec —
// fine for our use-case (onboarding only). If the lookup fails we return
// null and the caller just stores the location without coordinates.

export type GeocodeResult = { lat: number; lng: number; displayName: string };

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (q.length < 3) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`;
    const res = await fetch(url, {
      headers: {
        // Nominatim requires a User-Agent identifying the app.
        "User-Agent": "ShyftForce/1.0 (https://shyftforce.com)",
        Accept: "application/json",
      },
      // Hard timeout — onboarding is interactive.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    const first = data[0];
    if (!first) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, displayName: first.display_name };
  } catch {
    return null;
  }
}
