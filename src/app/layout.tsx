import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PWAProvider } from "@/components/pwa/pwa-provider";

// Primary UI font per design tokens (README.md). Falls back automatically to
// system fonts during load to avoid layout shift.
const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

// Monospace for timestamps, codes, eyebrows, kbd hints.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

// General Sans (display headlines) is loaded via Fontshare CDN <link> in <head>
// since it's not on Google Fonts. The `--font-general-sans` CSS variable is
// set in globals.css base layer fallback chain.

export const metadata: Metadata = {
  title: "shyftforce — The workforce platform that runs itself.",
  description: "AI scheduling, geofenced clock-in, real-time compliance, and a smart open-shift marketplace. One platform for restaurants, retail, security, healthcare, and field services — set up in 5 minutes.",
  applicationName: "shyftforce",
  appleWebApp: { capable: true, title: "shyftforce", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#050810",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Single-mode design (dark navy only). `dark` class is hard-pinned so any
  // legacy `dark:` Tailwind variants still resolve. The palette in
  // tailwind.config.ts is already navy/electric-blue at the unprefixed state.
  return (
    <html lang="en" className={`dark ${geist.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        {/* General Sans (display font) from Fontshare CDN */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
        <style dangerouslySetInnerHTML={{
          __html: `:root { --font-general-sans: "General Sans", var(--font-geist), "Söhne", system-ui, sans-serif; }`
        }} />
      </head>
      <body className="font-sans antialiased bg-ink-950 text-ink-50">
        <Providers>
          <PWAProvider>{children}</PWAProvider>
        </Providers>
      </body>
    </html>
  );
}
