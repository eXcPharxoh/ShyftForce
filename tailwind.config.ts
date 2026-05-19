import type { Config } from "tailwindcss";

// Tokens map 1:1 to the design system from design_handoff_shyftforce/README.md.
// `brand` = electric blue accent ladder. `ink` = navy surface + text ladder.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Electric-blue ramp. accent (#6aa2ff) lives at 500. accent-deep
        // (#3a6fd8) at 700. accent-2 (#8db9ff) at 300. 50/100/200 are tints
        // for soft backgrounds used in chips / hovers.
        brand: {
          50:  "#eef4ff",
          100: "#dee8ff",
          200: "#c1d6ff",
          300: "#8db9ff",   // accent-2
          400: "#7aaeff",
          500: "#6aa2ff",   // accent
          600: "#5891ee",
          700: "#3a6fd8",   // accent-deep
          800: "#2e5bb4",
          900: "#244a96",
        },
        // Navy ladder — text ramp at the light end (50/100/200/300), surface
        // ramp at the dark end (700/800/900/950). 400/500/600 are
        // intermediate text-mute / borders.
        ink: {
          50:  "#ecf1fb",   // primary text
          100: "#dde5f3",
          200: "#cbd5e1",
          300: "#b0bbd1",   // text-dim
          400: "#94a3b8",
          500: "#6c7a96",   // text-mute
          600: "#44506b",   // text-mute-2
          700: "#1a2440",   // surface-3 (inputs, pill bg)
          800: "#131b2e",   // surface-2 (elevated card)
          900: "#0d1422",   // surface (card base)
          950: "#050810",   // ink (page background)
        },
        // Semantic — design tokens from README
        success: { 500: "#4ee0c5", DEFAULT: "#4ee0c5" },
        warn:    { 500: "#f5b544", DEFAULT: "#f5b544" },
        danger:  { 500: "#f17a8e", DEFAULT: "#f17a8e" },
        violet:  { 500: "#a78bff", DEFAULT: "#a78bff" },
        cyan:    { 500: "#4ee0c5", DEFAULT: "#4ee0c5" },
      },
      fontFamily: {
        // General Sans for display, Geist for UI body, JetBrains Mono for code/time
        display: ["var(--font-general-sans)", "Geist", "Söhne", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        sans:    ["var(--font-geist)",        "Söhne", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono:    ["var(--font-jetbrains)",    "Berkeley Mono", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        "tight-2":   "-0.018em",
        "tight-3":   "-0.025em",
        "tight-4":   "-0.035em",
      },
      boxShadow: {
        // Multi-layer card shadow — inset highlight + drop shadow + soft glow
        card:       "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px -24px rgba(0,0,0,0.6), 0 8px 16px -8px rgba(0,0,0,0.4)",
        "card-hover": "0 1px 0 rgba(255,255,255,0.06) inset, 0 30px 56px -24px rgba(0,0,0,0.7), 0 12px 24px -8px rgba(0,0,0,0.5)",
        pop:        "0 1px 0 rgba(255,255,255,0.08) inset, 0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(106,162,255,0.08)",
        glow:       "0 0 0 1px rgba(106,162,255,0.2), 0 30px 80px -20px rgba(106,162,255,0.3)",
        "btn-primary": "0 1px 0 rgba(255,255,255,0.4) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 0 0 1px rgba(106,162,255,0.4), 0 10px 24px -8px rgba(106,162,255,0.5)",
        "btn-primary-hover": "0 1px 0 rgba(255,255,255,0.5) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 0 0 1px rgba(106,162,255,0.6), 0 14px 32px -8px rgba(106,162,255,0.65)",
        soft:       "0 8px 24px -8px rgba(0,0,0,0.4)",
        ring:       "0 0 0 3px rgba(106,162,255,0.20)",
        "inner-soft": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      borderRadius: {
        xs:    "0.375rem",   // r-xs 6px
        sm:    "0.625rem",   // r-sm 10px
        md:    "0.875rem",   // r-md 14px
        lg:    "1.125rem",   // r-lg 18px
        xl:    "1.125rem",
        "2xl": "1.625rem",   // r-xl 26px
        "3xl": "2rem",       // r-2xl 32px
      },
      keyframes: {
        "fade-in":         { from: { opacity: "0" },                   to: { opacity: "1" } },
        "fade-up":         { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in":        { from: { opacity: "0", transform: "scale(0.96)" },      to: { opacity: "1", transform: "scale(1)" } },
        "slide-in-right":  { from: { transform: "translateX(100%)" },               to: { transform: "translateX(0)" } },
        "shimmer":         { from: { backgroundPosition: "-200% 0" },               to: { backgroundPosition: "200% 0" } },
        "ping-soft":       { "0%":   { boxShadow: "0 0 0 0 rgba(78,224,197,0.5)" },
                             "70%":  { boxShadow: "0 0 0 8px rgba(78,224,197,0)" },
                             "100%": { boxShadow: "0 0 0 0 rgba(78,224,197,0)" } },
        "pulse-ring":      { "0%":   { transform: "scale(0.85)", opacity: "1" },
                             "100%": { transform: "scale(1.6)",  opacity: "0" } },
        "float":           { "0%, 100%": { transform: "translateY(0)" },
                             "50%":       { transform: "translateY(-6px)" } },
        "blink":           { "0%, 49%": { opacity: "1" }, "50%, 100%": { opacity: "0" } },
        "marquee":         { to: { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-in":        "fade-in 200ms ease-out",
        "fade-up":        "fade-up 900ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "scale-in":       "scale-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "slide-in-right": "slide-in-right 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "shimmer":        "shimmer 1.6s linear infinite",
        "ping-soft":      "ping-soft 2.2s infinite cubic-bezier(0, 0, 0.2, 1)",
        "pulse-ring":     "pulse-ring 3s infinite ease-out",
        "float":          "float 5s ease-in-out infinite",
        "blink":          "blink 1s infinite",
        "marquee":        "marquee 50s linear infinite",
      },
      backgroundImage: {
        // Faint 64px grid for hero + section backdrops
        "grid-faint":  "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        // Radial mesh used behind hero / CTAs
        "mesh-glow":   "radial-gradient(at 50% 0%, rgba(106,162,255,0.25) 0px, transparent 50%), radial-gradient(at 20% 100%, rgba(78,224,197,0.10) 0px, transparent 50%)",
        // Primary button gradient
        "btn-grad":    "linear-gradient(180deg, #7aaeff 0%, #6aa2ff 50%, #3a6fd8 100%)",
        // Gradient text variants
        "grad-text":   "linear-gradient(180deg, #fff 0%, #cfd9ee 100%)",
        "grad-accent": "linear-gradient(135deg, #9bc1ff 0%, #6aa2ff 50%, #6e8de8 100%)",
      },
      backgroundSize: {
        "grid-64": "64px 64px",
      },
      maxWidth: {
        "container":      "1280px",
        "container-wide": "1480px",
      },
    },
  },
  plugins: [],
};

export default config;
