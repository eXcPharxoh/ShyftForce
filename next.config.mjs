/** @type {import('next').NextConfig} */
const APP_HOST   = process.env.NEXT_PUBLIC_APP_HOST   ?? "app.shyftforce.com";
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST ?? "admin.shyftforce.com";

// Content-Security-Policy — locks down where scripts, styles, fonts, images,
// connections, and frames can come from. Allowlist matches what we actually
// load: Fontshare CDN for the display font, dicebear for avatars, OSM tile
// + Nominatim for the map, jsdelivr for the face-api model weights, and
// data: URIs for the inline selfie/avatar previews. 'unsafe-inline' for styles
// is needed because we set a CSS variable via dangerouslySetInnerHTML on the
// root <html>; if/when we move that, drop the unsafe-inline.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
  "font-src 'self' https://api.fontshare.com data:",
  "img-src 'self' data: blob: https://api.dicebear.com https://*.tile.openstreetmap.org",
  "connect-src 'self' https://nominatim.openstreetmap.org https://cdn.jsdelivr.net",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), interest-cohort=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
    // Allow larger uploads (document files up to 8MB) on Server Actions / multipart
    serverActions: { bodySizeLimit: "10mb" },
  },
  devIndicators: false,
  async headers() {
    return [
      // Global security headers on every response
      { source: "/(.*)", headers: securityHeaders },
      // App + admin: tell crawlers to NOT index (defense in depth — robots.txt + middleware also help)
      {
        source: "/:path*",
        has: [{ type: "host", value: APP_HOST }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: ADMIN_HOST }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};
export default nextConfig;
