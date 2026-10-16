"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { joinEventAction, leaveEventAction } from "@/app/profile/actions";

/** Turns web addresses in a sentence from the bot into links (the invite the bot gives someone who has to join the Discord first). */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s)]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-gold underline break-all">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Joins or leaves an event for the signed-in member. The bot decides (in the server, signups open, full or not) and its answer is shown as it came. */
export function EventJoinButton({ eventId, mode }: { eventId: string; mode: "join" | "leave" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  function press() {
    if (mode === "leave" && !window.confirm("Leave this event?")) return;
    setMessage(null);
    start(async () => {
      const result = await (mode === "join" ? joinEventAction : leaveEventAction)(eventId);
      if (!result.ok) return setMessage({ tone: "error", text: result.error });
      if (mode === "join" && result.data.result?.waiting) setMessage({ tone: "info", text: `The event is full, so you are on the waitlist at position ${result.data.result.position}.` });
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={press}
        className={mode === "join" ? "rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-60" : "text-sm text-muted underline disabled:opacity-60"}
      >
        {pending ? (mode === "join" ? "Joining…" : "Leaving…") : mode === "join" ? "Join" : "Leave this event"}
      </button>
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`text-xs ${message.tone === "error" ? "text-red-300" : "text-gold"}`}>
          <Linkified text={message.text} />
        </p>
      )}
    </div>
  );
}
