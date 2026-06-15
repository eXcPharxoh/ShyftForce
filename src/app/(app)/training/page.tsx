import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Training landing. The course authoring + viewer aren't built yet — we
 * used to render course cards that read "Course viewer coming soon",
 * which is a worse signal to a paying customer than just not showing
 * the feature. Show the empty-state explicitly until the viewer ships.
 *
 * Course data still lives in the DB and the API is intact — we just
 * don't surface unviewable courses in the UI. When the viewer is built,
 * restore the grid (see git history at this file for the prior shape).
 */
export default async function TrainingPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Learning & development"
        icon={GraduationCap}
        title="Training"
        subtitle="Onboarding, safety, compliance, and skill-building"
      />

      <div className="card">
        <EmptyState
          icon={Sparkles}
          tone="brand"
          title={isManager ? "Training is on the roadmap" : "No training assigned"}
          description={isManager
            ? "Course authoring and the lesson viewer are launching in a future release. We'll email you when they're ready — your team's data is safe in the meantime."
            : "Your manager will publish courses here when they're available."}
        />
      </div>
    </div>
  );
}
