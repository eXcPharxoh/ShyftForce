import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationsClient } from "@/components/settings/notifications-client";
import { Bell } from "lucide-react";

export default async function NotificationsSettingsPage() {
  const u = await requireUser();
  const member = await prisma.member.findUnique({
    where: { id: u.memberId },
    select: {
      phone: true, locale: true, calendarToken: true,
      smsOptIn: true, smsOptInShiftOffer: true, smsOptInScheduleChange: true,
      smsOptInTimeOff: true, smsOptInAlerts: true,
      smsQuietStartHour: true, smsQuietEndHour: true,
    },
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Personal"
        icon={Bell}
        title="Notifications & language"
        subtitle="Choose how shyftforce reaches you outside the app, and pick your preferred language."
      />
      <NotificationsClient initial={member ?? null} />
    </div>
  );
}
