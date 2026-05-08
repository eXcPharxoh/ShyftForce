import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel } from "@/lib/utils";
import { FileText, FileCheck, FileX, Inbox } from "lucide-react";

export default async function DocumentsPage() {
  const u = await requireUser();
  const [documents, requests] = await Promise.all([
    prisma.document.findMany({
      where: { organizationId: u.organizationId },
      include: { member: { include: { user: true } } },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.documentRequest.findMany({
      where: { member: { organizationId: u.organizationId } },
      include: { member: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-ink-500">{documents.length} on file · {requests.filter(r => r.status === "pending").length} pending requests</p>
        </div>
        <button className="btn-primary">Upload</button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Recent documents</h3>
          <ul className="space-y-2">
            {documents.map(d => (
              <li key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-ink-200 hover:bg-ink-50/40">
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-[11px] text-ink-500 truncate">{d.member?.user.name ?? "—"} · {d.category} · {dateLabel(d.uploadedAt)}</div>
                </div>
                <a href={d.url} className="btn-ghost text-xs">Open</a>
              </li>
            ))}
            {documents.length === 0 && <li className="text-xs text-ink-500 py-3 text-center">No documents on file.</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Inbox className="w-4 h-4" /> Document requests</h3>
          <ul className="space-y-2">
            {requests.map(r => (
              <li key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-ink-200">
                <div className={`w-9 h-9 rounded-lg ${r.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"} flex items-center justify-center`}>
                  {r.status === "pending" ? <FileX className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.documentName}</div>
                  <div className="text-[11px] text-ink-500 truncate">From: {r.member.user.name} · {dateLabel(r.createdAt)}</div>
                </div>
                <span className={r.status === "pending" ? "badge bg-amber-50 text-amber-700" : "badge-green"}>{r.status}</span>
              </li>
            ))}
            {requests.length === 0 && <li className="text-xs text-ink-500 py-3 text-center">No pending document requests.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
