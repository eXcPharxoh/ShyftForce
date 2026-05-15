import { KioskClient } from "@/components/kiosk/kiosk-client";

export const dynamic = "force-dynamic";
// Kiosk has its own brutalist standalone layout — outside the (app) layout
// so there's no sidebar/topbar leaking into a shared-device view.

export default async function KioskPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams;
  return <KioskClient initialToken={sp.token ?? null} />;
}
