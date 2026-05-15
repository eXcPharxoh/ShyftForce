/** @type {import('next').NextConfig} */
const APP_HOST   = process.env.NEXT_PUBLIC_APP_HOST   ?? "app.shyftforce.com";
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST ?? "admin.shyftforce.com";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), interest-cohort=()" },
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
