import Link from "next/link";
import { redirect } from "next/navigation";
import { EventWizard } from "@/components/dashboard/setup/EventWizard";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import type { EventDraft, OptionSchema } from "@/lib/eventOptions";
import { adminApi } from "@/lib/jonnybot-admin";
import { eventApiAction } from "../actions";

export const dynamic = "force-dynamic";

/** The guided setup of one draft: `?draft=<id>`. Without a draft that exists (or once it has been finished) it goes back to the list. */
export default async function NewEventPage({ params, searchParams }: { params: Promise<{ guildId: string }>; searchParams: Promise<{ draft?: string }> }) {
  const { guildId } = await params;
  const { draft: draftId } = await searchParams;
  const guild = await requireGuild(guildId);
  const back = `/dashboard/${guildId}/event-manager`;
  if (!draftId || !/^\d{1,18}$/.test(draftId)) redirect(back);

  const found = await adminApi.eventsCall(guild, "GET", `events/drafts/${draftId}`);
  if (!found.ok) redirect(back);
  const draft = (found.data as { draft: EventDraft }).draft;

  const [schema, structure] = await Promise.all([
    adminApi.eventsCall(guild, "GET", `events/setup/schema/${draft.template}`).then(dashboardData) as Promise<OptionSchema>,
    adminApi.structure(guild).then(dashboardData),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`New ${schema.label.toLowerCase()}`} description="Every option, a step at a time. What you enter is saved as a draft as you go, so you can leave and come back." />
      <Link href={back} className="text-sm text-gold hover:underline">
        All events
      </Link>
      <EventWizard guildId={guildId} initial={draft} schema={schema} structure={structure} call={eventApiAction.bind(null, guildId)} />
    </div>
  );
}
