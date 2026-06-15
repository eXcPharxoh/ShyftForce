"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Modern dropdown that replaces the native <select>. Gives us full
 * styling control over the popup, animated open, keyboard nav, and a
 * search filter when there are many options. Pass the same value/onChange
 * shape you'd give a native select.
 *
 * For simpler cases — where styling the native select via `select.input`
 * is enough — keep using the native one; this component is for the
 * surfaces where we want the next-level polish (industry pickers,
 * location filters, role pickers, etc.).
 */
export type SelectOption = {
  value: string;
  label: string;
  /** Optional secondary line shown smaller below the label */
  hint?: string;
  /** Optional icon to render to the left of the label */
  icon?: React.ReactNode;
  /** Disabled options can't be selected but still appear */
  disabled?: boolean;
};

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  searchable = false,
  disabled = false,
  className = "",
  id,
  ariaLabel,
}: {
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = searchable && query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Focus the search input when opening
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery("");
      setActiveIndex(-1);
    }
  }, [open, searchable]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      if (!open) { setOpen(true); e.preventDefault(); return; }
      if (activeIndex >= 0 && filtered[activeIndex] && !filtered[activeIndex].disabled) {
        onChange(filtered[activeIndex].value);
        setOpen(false);
        e.preventDefault();
      }
    }
    if (e.key === "Escape" && open) { setOpen(false); e.preventDefault(); }
    if (e.key === "ArrowDown") {
      if (!open) setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      e.preventDefault();
    }
    if (e.key === "ArrowUp") {
      setActiveIndex((i) => Math.max(i - 1, 0));
      e.preventDefault();
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        id={fieldId}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKey}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`
          w-full flex items-center justify-between gap-2.5 rounded-md border px-3.5 py-2.5
          text-sm text-left transition-all duration-200
          ${disabled
            ? "opacity-50 cursor-not-allowed border-white/[0.08] text-ink-500"
            : open
              ? "border-brand-500/60 ring-4 ring-brand-500/15 text-ink-50"
              : "border-white/[0.12] hover:border-white/[0.22] text-ink-50 cursor-pointer"
          }
        `}
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(26,36,64,0.45)",
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.03)",
        }}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {selected?.icon}
          <span className={`truncate ${!selected ? "text-ink-500" : ""}`}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-md border border-white/[0.12] shadow-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%), linear-gradient(180deg, rgb(19,27,46) 0%, rgb(13,20,34) 100%)",
            animation: "modal-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          role="listbox"
        >
          {searchable && (
            <div className="p-1.5 border-b border-white/[0.06]">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search…"
                className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-500 px-2 py-1 outline-none"
              />
            </div>
          )}
          <ul className="max-h-72 overflow-y-auto scroll-thin py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-[13px] text-ink-500">No matches</li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isActive = i === activeIndex;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => {
                      if (!opt.disabled) { onChange(opt.value); setOpen(false); }
                    }}
                    className={`
                      flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer
                      ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}
                      ${isActive && !opt.disabled ? "bg-white/[0.05]" : ""}
                      ${isSelected ? "text-brand-200" : "text-ink-100"}
                    `}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {opt.icon}
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">{opt.label}</span>
                        {opt.hint && (
                          <span className="block text-[11px] text-ink-500 truncate">{opt.hint}</span>
                        )}
                      </span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-brand-300 shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
