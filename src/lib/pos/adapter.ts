import type { PosAdapter, PosProvider } from "./types";
import { manualAdapter } from "./manual";
import { toastAdapter } from "./toast";
import { squareAdapter } from "./square";

const REGISTRY: Record<PosProvider, PosAdapter> = {
  manual: manualAdapter,
  toast: toastAdapter,
  square: squareAdapter,
  clover: manualAdapter, // TODO: build dedicated adapter; stubbed to manual for now
};

export function getAdapter(provider: PosProvider): PosAdapter {
  return REGISTRY[provider] ?? manualAdapter;
}

export const SUPPORTED_PROVIDERS: { id: PosProvider; label: string; status: "live" | "stub" | "manual" }[] = [
  { id: "manual", label: "Manual entry", status: "manual" },
  { id: "toast", label: "Toast", status: "stub" },
  { id: "square", label: "Square", status: "stub" },
  { id: "clover", label: "Clover (coming soon)", status: "stub" },
];
