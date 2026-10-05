import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { COLOR_PALETTE, getMemberInfo } from "@/lib/jonnybot";
import { whoAmI } from "@/lib/jonnybot-admin";
import { updateColorRoleAction, updateNicknameAction } from "./actions";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  const { user } = session;
  const [member, access] = await Promise.all([getMemberInfo(user.id), whoAmI(user.id)]);
  const isAdmin = access.ok && access.data.allowed;

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
