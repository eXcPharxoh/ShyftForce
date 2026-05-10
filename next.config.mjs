/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
    // Allow larger uploads (document files up to 8MB) on Server Actions / multipart
    serverActions: { bodySizeLimit: "10mb" },
  },
  devIndicators: false,
};
export default nextConfig;
