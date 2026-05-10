import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MessengerClient } from "@/components/messenger/messenger-client";
import { PageHeader } from "@/components/ui/page-header";
import { MessageSquare } from "lucide-react";

export default async function MessengerPage() {
  const u = await requireUser();
  const [contacts, messages] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active", id: { not: u.memberId } },
      include: { user: true, location: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.message.findMany({
      where: { OR: [{ fromId: u.memberId }, { toId: u.memberId }] },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const contactsLite = contacts.map(c => ({
    id: c.id,
    name: c.user.name,
    avatar: c.user.avatar,
    role: c.role,
    location: c.location?.name,
  }));

  const unread = messages.filter(m => m.toId === u.memberId && !m.readAt).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Communication"
        icon={MessageSquare}
        title="Messenger"
        subtitle={`${contactsLite.length} teammate${contactsLite.length === 1 ? "" : "s"}${unread > 0 ? ` · ${unread} unread` : ""}`}
      />
      <MessengerClient
        me={{ id: u.memberId, name: u.name }}
        contacts={contactsLite}
        initialMessages={messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
