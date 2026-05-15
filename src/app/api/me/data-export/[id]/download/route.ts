// Download the JSON payload of a completed data export.
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const exp = await prisma.dataExportRequest.findFirst({
    where: { id, userId: u.id, status: "ready" },
    select: { payload: true, expiresAt: true },
  });
  if (!exp?.payload) return new Response("Not found or expired", { status: 404 });
  if (exp.expiresAt && exp.expiresAt < new Date()) {
    return new Response("Export expired. Generate a new one.", { status: 410 });
  }
  return new Response(exp.payload, {
    status: 200,
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="shyftforce-data-${id.slice(0, 8)}.json"`,
      "Cache-Control":       "no-store",
    },
  });
}
