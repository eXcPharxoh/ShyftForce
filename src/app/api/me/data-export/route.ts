// GDPR / CCPA data export. POST kicks off a build, GET fetches the most
// recent ready export. We keep it inline in the DB rather than hitting blob
// storage — the payload caps at 1-2 MB for typical users.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { buildUserExport } from "@/lib/gdpr/export";
import { audit } from "@/lib/audit";

const EXPORT_VALID_DAYS = 7;

export async function POST() {
  const u = await requireUser();

  // Throttle: at most one export every 5 minutes per user
  const recent = await prisma.dataExportRequest.findFirst({
    where: { userId: u.id, status: { in: ["pending", "building"] }, createdAt: { gt: new Date(Date.now() - 5 * 60_000) } },
  });
  if (recent) return NextResponse.json({ error: "An export is already in progress. Try again in a few minutes." }, { status: 429 });

  const request = await prisma.dataExportRequest.create({
    data: {
      userId: u.id,
      organizationId: u.organizationId,
      status: "building",
    },
  });

  // Build synchronously — fast enough at our scale. For larger orgs move to a queue.
  try {
    const { payload, sizeBytes } = await buildUserExport(u.id);
    await prisma.dataExportRequest.update({
      where: { id: request.id },
      data: {
        status: "ready",
        payload: JSON.stringify(payload),
        sizeBytes,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + EXPORT_VALID_DAYS * 86400_000),
      },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "user.signup", entityType: "DataExportRequest", entityId: request.id,
      metadata: { sizeBytes, kind: "gdpr_export" },
    });
    return NextResponse.json({ ok: true, id: request.id, sizeBytes, expiresAt: new Date(Date.now() + EXPORT_VALID_DAYS * 86400_000) });
  } catch (e: any) {
    console.error("[gdpr] export failed:", e);
    await prisma.dataExportRequest.update({
      where: { id: request.id },
      data: { status: "failed", errorMessage: e?.message ?? "build failed" },
    });
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  const u = await requireUser();
  // Show the most recent ready or in-progress export
  const last = await prisma.dataExportRequest.findFirst({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, sizeBytes: true, createdAt: true, completedAt: true, expiresAt: true },
  });
  return NextResponse.json({ export: last });
}
