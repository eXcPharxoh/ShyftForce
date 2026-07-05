// In-app endpoint for the AI Auto-Replier. The Co-pilot does this for
// managers; this is the employee-facing slimmer version, gated to their data.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { replyToMessage } from "@/lib/replier/ai";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({ message: z.string().min(1).max(2000) }).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  // Throttle per user — replyToMessage fans out to paid model calls on the
  // operator's shared Anthropic key; an unthrottled loop is a cost DoS.
  const rl = rateLimit({ key: `replier:${u.id}`, max: 20, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "You're sending messages too fast — give it a few seconds." }, { status: 429 });
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const r = await replyToMessage({ user: u, userMessage: parsed.data.message, viaSms: false });
  return NextResponse.json(r);
}
