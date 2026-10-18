import { GuideCards } from "@/components/dashboard/wizard/GuideCards";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { requireGuild } from "@/lib/dashboard";

export default async function GuidePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  await requireGuild(guildId);

  return (
    <div className="space-y-6">
      <PageHeader title="Guided setup" description="A step-by-step run through the parts of JonnyBot. It starts from what is already set here, so you can leave at any point and pick it up again." />
      <GuideCards guildId={guildId} />
    </div>
  );
}
