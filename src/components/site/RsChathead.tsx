"use client";

import { useState } from "react";

/**
 * A member's in-game chathead, from `/api/chathead/<rsn>`. The picture is a transparent PNG and is drawn as it is, with
 * no tile or frame around it, in a fixed square of `size` pixels with the picture fitted inside (never stretched), so
 * putting it next to a name can't change the row's height or squash the picture. If the picture can't be fetched it
 * shows the name's first letter in a small tile instead.
 */
export function RsChathead({ rsn, size = 24, className = "" }: { rsn: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  if (failed) {
    return (
      <span aria-hidden="true" style={{ ...box, fontSize: Math.max(10, Math.round(size * 0.5)) }} className={`inline-flex shrink-0 items-center justify-center rounded-md bg-white/5 font-semibold text-muted ${className}`}>
        {rsn.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small same-site picture that is already cached and sized; the image optimiser adds nothing
    <img
      src={`/api/chathead/${encodeURIComponent(rsn)}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={box}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
