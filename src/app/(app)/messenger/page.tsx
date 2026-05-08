import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MessengerClient } from "@/components/messenger/messenger-client";

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

  return <MessengerClient me={{ id: u.memberId, name: u.name }} contacts={contactsLite} initialMessages={messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() }))} />;
}
