import Image from "next/image";

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
        <PlaceholderCard
          title="Who's Online"
          description="Live member presence from Discord — coming soon, once JonnyBot's internal API is wired up."
        />
        <PlaceholderCard
          title="Upcoming Events"
          description="Your server's scheduled Discord events, pulled in automatically — coming soon."
        />
      </section>
    </div>
  );
}

function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface p-6">
      <h2 className="font-semibold text-gold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}
