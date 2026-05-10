import { requireUser } from "@/lib/session";
import { getOrCreateWorkerProfile } from "@/lib/network/profile";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "@/components/network/profile-form";
import { UserCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkerProfilePage() {
  const u = await requireUser();
  const p = await getOrCreateWorkerProfile(u.id);
  const skills: string[] = (() => { try { return p.skills ? JSON.parse(p.skills) : []; } catch { return []; } })();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cross-employer identity"
        icon={UserCircle}
        title="Worker profile"
        subtitle="Your reputation + skills travel with you. Discoverable workers can claim shifts from any employer on the network."
      />
      <section className="card p-5">
        <ProfileForm initial={{
          legalFirstName: p.legalFirstName,
          legalLastName: p.legalLastName,
          bio: p.bio,
          city: p.city,
          stateRegion: p.stateRegion,
          skills,
          discoverable: p.discoverable,
          reputationScore: p.reputationScore,
          totalShiftsCompleted: p.totalShiftsCompleted,
          totalEmployers: p.totalEmployers,
        }} />
      </section>
    </div>
  );
}
