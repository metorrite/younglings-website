import Image from "next/image";
import { OnlineMembersCard } from "@/components/OnlineMembersCard";
import { UpcomingEventsCard } from "@/components/UpcomingEventsCard";

// Revalidate this page's data (online members, events) every 30s rather than fetching on every
// request or caching it forever — "online" status especially would look stale otherwise.
export const revalidate = 30;

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <section className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/clan-logo.png"
          alt="Younglings"
          width={120}
          height={120}
          className="rounded-full ring-2 ring-gold/40"
        />
        <div>
          <p className="text-sm tracking-widest text-muted uppercase">Welcome to</p>
          <h1 className="text-4xl font-bold tracking-wide text-gold sm:text-5xl">Younglings</h1>
        </div>
        <p className="max-w-xl text-muted">
          Log in with Discord to see your profile, check who&apos;s online, and keep up with
          upcoming events.
        </p>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-2">
        <OnlineMembersCard />
        <UpcomingEventsCard />
      </section>
    </div>
  );
}
