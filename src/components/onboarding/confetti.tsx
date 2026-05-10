"use client";
import { useEffect, useRef } from "react";

// Tiny canvas-based confetti — no dependencies
export function Confetti({ trigger }: { trigger: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!trigger || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;
    const colors = ["#f97316", "#fb923c", "#e11d48", "#f43f5e", "#fbbf24", "#10b981", "#6366f1"];
    type P = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vrot: number; color: string; shape: "rect" | "circle" };
    const particles: P[] = [];
    for (let i = 0; i < 180; i++) {
      particles.push({
        x: w / 2 + (Math.random() - 0.5) * 60,
        y: h / 2 - 20,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 16 - 6,
        r: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() < 0.6 ? "rect" : "circle",
      });
    }
    const start = performance.now();
    let rafId = 0;
    function frame(t: number) {
      const elapsed = t - start;
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.vy += 0.45;             // gravity
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = Math.max(0, 1 - elapsed / 3500);
        if (p.shape === "rect") ctx!.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        else { ctx!.beginPath(); ctx!.arc(0, 0, p.r, 0, Math.PI * 2); ctx!.fill(); }
        ctx!.restore();
      }
      if (elapsed < 4000) rafId = requestAnimationFrame(frame);
      else ctx!.clearRect(0, 0, w, h);
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [trigger]);

  return <canvas ref={ref} className="fixed inset-0 z-[100] pointer-events-none" />;
}
