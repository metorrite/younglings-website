import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  const { user } = session;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-surface-border bg-surface p-8">
        <div className="flex items-center gap-4">
          {user.image && (
            <Image
              src={user.image}
              alt=""
              width={72}
              height={72}
              className="rounded-full ring-2 ring-gold/40"
            />
          )}
          <div>
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <p className="text-sm text-muted">Discord ID: {user.id}</p>
          </div>
        </div>

        <div className="mt-8 rounded-md border border-dashed border-surface-border p-4 text-sm text-muted">
          This is the v1 profile page — just your Discord identity for now. Clan data (coffer
          balance, signups, boss tags) will show up here as the site grows.
        </div>
      </div>
    </div>
  );
}
