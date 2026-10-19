import Link from "next/link";

export const metadata = { title: "Owner only — Younglings" };

/** What the owner-only Super admin pages answer (HTTP 403) to anyone but the bot's owner, however high their role in a server. */
export default function Forbidden() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold">Owner only</h1>
      <p className="mt-3 text-sm text-muted">This part of the admin area is for the owner of JonnyBot. Your server admin role does not open it.</p>
      <Link href="/admin" className="mt-6 inline-block text-sm text-gold hover:underline">
        Back to the admin home
      </Link>
    </div>
  );
}
