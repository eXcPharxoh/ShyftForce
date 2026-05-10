import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB cap (in-DB storage)

export async function POST(req: Request) {
  const u = await requireUser();
  const form = await req.formData();
  const file     = form.get("file");
  const name     = (form.get("name") as string | null) ?? null;
  const category = (form.get("category") as string | null) ?? null;
  const memberId = (form.get("memberId") as string | null) ?? null;

  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > MAX_BYTES)   return NextResponse.json({ error: `File too large — max ${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB` }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());

  // Sanity: if memberId given, must belong to org
  if (memberId) {
    const m = await prisma.member.findUnique({ where: { id: memberId } });
    if (!m || m.organizationId !== u.organizationId) return NextResponse.json({ error: "member not in your org" }, { status: 404 });
  }

  const doc = await prisma.document.create({
    data: {
      organizationId: u.organizationId,
      memberId:       memberId ?? null,
      uploadedById:   u.id,
      name:           name?.trim() || file.name,
      category:       category?.trim() || null,
      mimeType:       file.type || "application/octet-stream",
      sizeBytes:      file.size,
      data:           buf,
      url:            null,
    },
    select: { id: true, name: true, category: true, mimeType: true, sizeBytes: true, uploadedAt: true },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "Document", entityId: doc.id,  // reuse closest action label
    metadata: { name: doc.name, sizeBytes: doc.sizeBytes },
  });

  return NextResponse.json(doc);
}

// List org documents (with optional memberId filter)
export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");
  const docs = await prisma.document.findMany({
    where: { organizationId: u.organizationId, ...(memberId ? { memberId } : {}) },
    select: { id: true, name: true, category: true, mimeType: true, sizeBytes: true, uploadedAt: true, memberId: true,
              member: { select: { user: { select: { name: true } } } } },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json({ documents: docs });
}
