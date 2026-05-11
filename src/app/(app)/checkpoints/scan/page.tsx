import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { ScanForm } from "@/components/checkpoints/scan-form";
import { QrCode } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  return (
    <div className="space-y-5 max-w-md mx-auto">
      <PageHeader
        eyebrow="Patrol tour"
        icon={QrCode}
        title="Scan checkpoint"
        subtitle="Tap the post's QR code with your camera, or paste the token below"
      />
      <ScanForm initialToken={sp.t ?? ""} />
    </div>
  );
}
