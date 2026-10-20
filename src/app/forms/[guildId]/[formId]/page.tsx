import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormFiller } from "@/components/forms/FormFiller";
import { authOptions } from "@/lib/auth";
import { fetchPublicForm } from "@/lib/webForms";
import { submitFormAction } from "./actions";

export const metadata = { title: "Form", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * A server's web form, for anyone signed in with Discord. Anyone can read the questions (so they know what is asked before signing in); sending
 * needs the Discord sign-in, and the bot checks they are in the server. A form that is switched off, or does not exist, is a plain 404.
 */
export default async function FormPage({ params }: { params: Promise<{ guildId: string; formId: string }> }) {
  const { guildId, formId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const result = await fetchPublicForm(guildId, formId, userId);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Form unavailable</h1>
        <p className="mt-3 text-sm text-muted">{result.error}</p>
      </div>
    );
  }
  const form = result.form;
  const returnTo = `/forms/${guildId}/${formId}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-2 border-b border-surface-border pb-5">
        <p className="text-sm text-muted">{form.guildName}</p>
        <h1 className="text-2xl font-semibold">{form.title}</h1>
        {form.description && <p className="whitespace-pre-line text-sm text-muted">{form.description}</p>}
      </header>

      {!userId ? (
        <div className="space-y-4 rounded-xl border border-surface-border bg-surface p-5">
          <p className="text-sm">Sign in with Discord to fill this in. We only use it to know who is sending the form.</p>
          <Link href={`/api/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`} className="inline-block rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
            Sign in with Discord
          </Link>
        </div>
      ) : (
        <FormFiller questions={form.questions} disabledReason={form.canSubmit === false ? (form.reason ?? "You cannot send this form right now.") : null} send={submitFormAction.bind(null, guildId, formId)} />
      )}
    </div>
  );
}
