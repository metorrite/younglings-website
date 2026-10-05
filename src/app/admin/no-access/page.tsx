import Link from "next/link";

export const metadata = { title: "No access — Younglings" };

/** Where a logged-in user lands if the bot says they aren't an Admin or Developer. Reveals nothing about the dashboard. */
export default function NoAccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold">No access</h1>
      <p className="mt-3 text-sm text-muted">This area is for server admins. If you think you should have access, ask in the Younglings Discord.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-gold hover:underline">
        Back to the home page
      </Link>
    </div>
  );
}
