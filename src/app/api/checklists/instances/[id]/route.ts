import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const ResponseSchema = z.object({
  itemId:      z.string(),
  done:        z.boolean(),
  photoData:   z.string().max(500_000).optional().nullable(), // base64 ~500KB max
  note:        z.string().max(2000).optional().nullable(),
}).strict();

const PatchSchema = z.object({
  response:  ResponseSchema.optional(),
  responses: z.array(ResponseSchema).optional(),
  complete:  z.boolean().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const inst = await prisma.checklistInstance.findFirst({
    where: { id, memberId: u.memberId },
    include: { template: { select: { items: true, requireCompletion: true } } },
  });
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Merge new response(s) into existing responses array, keyed by itemId
  let responses: any[] = [];
  try { responses = JSON.parse(inst.responses); } catch {}
  const merged = new Map<string, any>();
  for (const r of responses) merged.set(r.itemId, r);
  const incoming = [...(parsed.data.responses ?? []), ...(parsed.data.response ? [parsed.data.response] : [])];
  for (const r of incoming) {
    merged.set(r.itemId, { ...r, completedAt: r.done ? new Date().toISOString() : null });
  }
  const newResponses = Array.from(merged.values());

  // Validate completion: all required-photo / required-note items have them
  let canComplete = true;
  if (parsed.data.complete) {
    const templateItems: any[] = (() => { try { return JSON.parse(inst.template.items); } catch { return []; } })();
    for (const ti of templateItems) {
      const resp = merged.get(ti.id);
      if (!resp || !resp.done) { canComplete = false; break; }
      if (ti.requiresPhoto && !resp.photoData) { canComplete = false; break; }
      if (ti.requiresNote  && !resp.note?.trim()) { canComplete = false; break; }
    }
    if (!canComplete) {
      return NextResponse.json({ error: "Some items are missing — finish all required items + photos/notes first." }, { status: 400 });
    }
  }

  const updated = await prisma.checklistInstance.update({
    where: { id },
    data: {
      responses: JSON.stringify(newResponses),
      completedAt: parsed.data.complete ? new Date() : inst.completedAt,
    },
  });

  return NextResponse.json({ ok: true, instance: { ...updated, responses: newResponses } });
}
