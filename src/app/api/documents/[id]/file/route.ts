import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || doc.organizationId !== u.organizationId) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Employees can only read their OWN documents (ID scans, certs, letters).
  // Managers/admins can read any doc in the org. Previously any employee
  // could download a colleague's HR files by guessing/enumerating ids.
  if (u.role === "EMPLOYEE" && doc.memberId !== u.memberId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!doc.data) return NextResponse.json({ error: "no data stored" }, { status: 404 });
  return new NextResponse(Buffer.from(doc.data), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
      "Content-Length": String(doc.sizeBytes ?? doc.data.byteLength),
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || doc.organizationId !== u.organizationId) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Same ownership rule as the download: employees can only delete their own.
  if (u.role === "EMPLOYEE" && doc.memberId !== u.memberId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
