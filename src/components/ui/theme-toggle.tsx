"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "shyftforce-theme";

function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setTheme(saved);
    applyTheme(saved);
    setMounted(true);

    // Live-update if user toggles OS theme while on "system"
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem(STORAGE_KEY) as Theme | null) === "system") applyTheme("system");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  function set(t: Theme) {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }

  if (!mounted) {
    return <div className="w-[114px] h-9" aria-hidden />;
  }

  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-ink-100 dark:bg-ink-800 border border-ink-200/70 dark:border-ink-700">
      <Btn label="Light"  active={theme === "light"}  onClick={() => set("light")}><Sun className="w-3.5 h-3.5" /></Btn>
      <Btn label="System" active={theme === "system"} onClick={() => set("system")}><Monitor className="w-3.5 h-3.5" /></Btn>
      <Btn label="Dark"   active={theme === "dark"}   onClick={() => set("dark")}><Moon className="w-3.5 h-3.5" /></Btn>
    </div>
  );
}

function Btn({ children, active, label, onClick }: { children: React.ReactNode; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center transition",
        active
          ? "bg-white text-brand-600 shadow-sm dark:bg-ink-900 dark:text-brand-300"
          : "text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200",
      )}
    >
      {children}
    </button>
  );
}

// Compact icon-only variant
export function ThemeToggleIcon() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setTheme(saved); setMounted(true);
  }, []);

  function cycle() {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  if (!mounted) return <div className="w-10 h-10" aria-hidden />;

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme} (click to cycle)`}
      className="w-10 h-10 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 flex items-center justify-center transition text-ink-600 dark:text-ink-300"
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );
}
