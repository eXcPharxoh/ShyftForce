import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        ink: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      letterSpacing: {
        "tight-2": "-0.018em",
      },
      boxShadow: {
        card:    "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        "card-hover": "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)",
        soft:    "0 8px 24px -8px rgba(15,23,42,0.08)",
        ring:    "0 0 0 3px rgba(249,115,22,0.20)",
        "inner-soft": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      borderRadius: {
        xl:  "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-in":         { from: { opacity: "0" },                   to: { opacity: "1" } },
        "fade-up":         { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in":        { from: { opacity: "0", transform: "scale(0.96)" },     to: { opacity: "1", transform: "scale(1)" } },
        "slide-in-right":  { from: { transform: "translateX(100%)" },              to: { transform: "translateX(0)" } },
        "shimmer":         { from: { backgroundPosition: "-200% 0" },              to: { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-in":        "fade-in 200ms ease-out",
        "fade-up":        "fade-up 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "scale-in":       "scale-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "slide-in-right": "slide-in-right 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "shimmer":        "shimmer 1.6s linear infinite",
      },
      backgroundImage: {
        "grid-faint": "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)",
        "noise": "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
      },
    },
  },
  plugins: [],
};

export default config;
