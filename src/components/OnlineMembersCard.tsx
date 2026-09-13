import Image from "next/image";
import { getOnlineMembers, roleColorCss } from "@/lib/jonnybot";

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-500",
  dnd: "bg-red-500",
};

export async function OnlineMembersCard() {
  const members = await getOnlineMembers();

  return (
    <div className="rounded-lg border border-surface-border bg-surface p-6">
      <h2 className="font-semibold text-gold">Who&apos;s Online</h2>

      {members === null ? (
        <p className="mt-2 text-sm text-muted">
          Not connected to JonnyBot yet — set up the internal API to see this live.
        </p>
      ) : members.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nobody&apos;s online right now.</p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              <span className="relative shrink-0">
                <Image
                  src={member.avatarUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <span
                  className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${STATUS_DOT[member.status] ?? "bg-neutral-500"}`}
                />
              </span>
              <span className="min-w-0">
                <span
                  className="block truncate text-sm font-medium"
                  style={{ color: roleColorCss(member.topRole?.colorRaw) }}
                >
                  {member.displayName}
                </span>
                {member.topRole && (
                  <span className="block truncate text-xs text-muted">{member.topRole.name}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
