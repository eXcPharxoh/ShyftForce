import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel } from "@/lib/utils";
import { FileText, FileCheck, FileX, Inbox, FolderClosed } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { UploadButton } from "@/components/documents/upload-button";

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
      <PageHeader
        eyebrow="Records"
        icon={FolderClosed}
        title="Documents"
        subtitle={`${documents.length} on file · ${requests.filter(r => r.status === "pending").length} pending requests`}
      >
        <UploadButton />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Recent documents</h3>
          <ul className="space-y-2">
            {documents.map(d => (
              <li key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-ink-200 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-ink-900 dark:text-ink-100">{d.name}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400 truncate">
                    {d.member?.user.name ?? "—"} · {d.category ?? "uncategorized"} · {dateLabel(d.uploadedAt)}
                    {d.sizeBytes != null && <> · {(d.sizeBytes / 1024).toFixed(1)} KB</>}
                  </div>
                </div>
                <a href={d.data ? `/api/documents/${d.id}/file` : (d.url ?? "#")} target="_blank" rel="noopener" className="btn-ghost text-xs">Open</a>
              </li>
            ))}
            {documents.length === 0 && (
              <li>
                <EmptyState
                  icon={FolderClosed}
                  title="No documents on file"
                  description="Upload signed contracts, ID verifications, training certs. Or send a document request to your team."
                />
              </li>
            )}
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
            {requests.length === 0 && (
              <li>
                <EmptyState
                  icon={Inbox}
                  tone="success"
                  title="Inbox zero"
                  description="No pending document requests. When you ask a team member for a document, you'll see it here."
                />
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
