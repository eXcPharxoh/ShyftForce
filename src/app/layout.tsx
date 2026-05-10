import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PWAProvider } from "@/components/pwa/pwa-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "shyftforce — Workforce that runs itself",
  description: "AI-powered scheduling, attendance, payroll & HR for multi-location teams.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f97316" },
    { media: "(prefers-color-scheme: dark)",  color: "#08101e" },
  ],
};

// Runs before hydration to set the right theme class on <html> — prevents flash
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('shyftforce-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <PWAProvider>{children}</PWAProvider>
        </Providers>
      </body>
    </html>
  );
}
