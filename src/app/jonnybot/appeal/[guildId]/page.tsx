import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { Page, Section } from "@/components/jonnybot/Prose";
import { authOptions } from "@/lib/auth";
import { appealsApi } from "@/lib/appeals";
import { AppealForm } from "./AppealForm";

export const metadata: Metadata = { title: "Appeal", description: "Appeal a ban or timeout on a server that uses JonnyBot." };
export const dynamic = "force-dynamic";

/**
 * Ban and mute appeals (T-033): anyone signs in with Discord and appeals their own ban or running timeout on a server that takes appeals here. The
 * moderation DM links to this page. It isn't behind the JonnyBot site's beta gate: someone who was banned needs it whatever stage the site is at.
 * Only the signed-in person's own cases are shown; the server's staff decide in a ticket or on their dashboard.
 */
export default async function AppealPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  if (!/^\d{1,20}$/.test(guildId)) notFound();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const signIn = `/api/auth/signin?callbackUrl=${encodeURIComponent(`/jonnybot/appeal/${guildId}`)}`;

  if (!userId) {
    return (
      <Page title="Appeal a ban or timeout" intro="Sign in with Discord so the server knows who is appealing. Only your own cases are shown to you.">
        <Section title="Sign in">
          <p>
            <a href={signIn} className="text-gold underline-offset-2 hover:underline">
              Sign in with Discord
            </a>{" "}
            to see the cases you can appeal on this server.
          </p>
        </Section>
      </Page>
    );
  }

  const result = await appealsApi.view(guildId, userId);
  if (!result.ok && result.notFound) notFound();
  if (!result.ok) {
    return (
      <Page title="Appeal a ban or timeout" intro="">
        <p className="text-sm text-red-300">{result.error}</p>
      </Page>
    );
  }
  const view = result.data;
  return (
    <Page title={`Appeal on ${view.server.name}`} intro="Appeal your own ban or running timeout. The server's staff read every appeal and decide; you'll see their answer here.">
      {view.enabled ? (
        <AppealForm guildId={guildId} initial={view} />
      ) : (
        <p className="text-sm text-muted">This server doesn&apos;t take appeals on the website. If its message to you named another way to appeal, use that.</p>
      )}
    </Page>
  );
}
