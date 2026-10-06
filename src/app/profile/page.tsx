import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { COLOR_PALETTE, getMemberInfo } from "@/lib/jonnybot";
import { whoAmI } from "@/lib/jonnybot-admin";
import { compact, getMyRsns, getProfile, shortDate } from "@/lib/site";
import { updateColorRoleAction, updateNicknameAction } from "./actions";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  const { user } = session;
  // The visitor's own linked RuneScape names — looked up with the id from their verified login, never from the URL.
  const [member, access, rsns] = await Promise.all([getMemberInfo(user.id), whoAmI(user.id), getMyRsns(user.id)]);
  const isAdmin = access.ok && access.data.allowed;
  const mine = rsns && rsns.length > 0 ? await getProfile(rsns[0]) : null;

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
            <h1 className="text-2xl font-semibold">{member?.nickname || user.name}</h1>
            <p className="text-sm text-muted">Discord ID: {user.id}</p>
          </div>
        </div>

        {isAdmin && (
          <Link
            href="/admin"
            className="mt-6 inline-block rounded-md border border-gold/40 px-3 py-1.5 text-sm text-gold transition hover:bg-gold/10"
          >
            Open the admin dashboard →
          </Link>
        )}

        <section className="mt-8 rounded-lg border border-surface-border bg-background/40 p-5">
          <h2 className="font-semibold text-gold">Your clan profile</h2>
          {rsns === null ? (
            <p className="mt-2 text-sm text-muted">Can&apos;t reach JonnyBot right now, so your clan stats aren&apos;t available.</p>
          ) : rsns.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No RuneScape name is linked to your Discord account yet. Use <code className="rounded bg-white/10 px-1">/rs</code> in the Younglings Discord to link yours and your stats will show up here.
            </p>
          ) : mine === null ? (
            <p className="mt-2 text-sm text-muted">
              <strong className="text-foreground">{rsns[0]}</strong> is linked, but isn&apos;t a current clan member, so there&apos;s no clan profile to show.
            </p>
          ) : (
            <div className="mt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/members/${encodeURIComponent(mine.rsn)}`} className="text-lg font-semibold hover:text-gold">
                  {mine.rsn} →
                </Link>
                <span className="text-sm text-muted">
                  {mine.rank} · since {shortDate(mine.joined)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted">Total level</dt>
                  <dd className="font-semibold">{mine.totalLevel ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">XP this week</dt>
                  <dd className="font-semibold">+{compact(mine.gains.week)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Clan points</dt>
                  <dd className="font-semibold">{mine.points}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Citadel caps</dt>
                  <dd className="font-semibold">{mine.citadel.caps}</dd>
                </div>
              </dl>
              {mine.nextRank && (
                <p className="mt-3 text-xs text-muted">
                  {mine.promotionNeeded ? `Eligible for ${mine.nextRank.name} — promotion pending.` : `${mine.nextRank.pointsNeeded} points to ${mine.nextRank.name}.`}
                </p>
              )}
              {rsns.length > 1 && <p className="mt-2 text-xs text-muted">Also linked: {rsns.slice(1).join(", ")}</p>}
            </div>
          )}
        </section>

        {member === null ? (
          <div className="mt-8 rounded-md border border-dashed border-surface-border p-4 text-sm text-muted">
            Not connected to JonnyBot right now, so server nickname/color options aren&apos;t
            available — just your Discord identity above for now.
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="font-semibold text-gold">Server Nickname</h2>
              <p className="mt-1 text-sm text-muted">
                What Younglings shows for you instead of {member.username}.
              </p>
              <form action={updateNicknameAction} className="mt-3 flex gap-2">
                <input
                  type="text"
                  name="nickname"
                  maxLength={32}
                  defaultValue={member.nickname ?? ""}
                  placeholder={member.username}
                  className="flex-1 rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                />
                <button
                  type="submit"
                  className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110"
                >
                  Save
                </button>
              </form>
              <p className="mt-1 text-xs text-muted">Leave blank to reset to your Discord username.</p>
            </section>

            <section>
              <h2 className="font-semibold text-gold">Name Color</h2>
              <p className="mt-1 text-sm text-muted">
                Purely cosmetic — picks which color your name shows in this server.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(COLOR_PALETTE).map(([name, hex]) => (
                  <form action={updateColorRoleAction} key={name}>
                    <input type="hidden" name="color" value={name} />
                    <button
                      type="submit"
                      title={name}
                      className="h-9 w-9 rounded-full transition"
                      style={{
                        backgroundColor: hex,
                        outline: member.colorRole === name ? "2px solid var(--color-gold)" : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  </form>
                ))}
                <form action={updateColorRoleAction}>
                  <input type="hidden" name="color" value="" />
                  <button
                    type="submit"
                    title="Clear"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-xs text-muted transition hover:text-foreground"
                    style={{
                      outline: member.colorRole === null ? "2px solid var(--color-gold)" : "none",
                      outlineOffset: "2px",
                    }}
                  >
                    ✕
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
