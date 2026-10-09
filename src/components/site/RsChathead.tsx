"use client";

import { useState } from "react";

/**
 * A member's in-game chathead, from `/api/chathead/<rsn>`. Always drawn in a fixed square of `size` pixels with the
 * picture fitted inside it (never stretched), so putting it next to a name can't change the row's height or squash
 * the picture. If the picture can't be fetched it shows the name's first letter in the same square instead.
 */
export function RsChathead({ rsn, size = 24, sizeClassName, className = "" }: { rsn: string; size?: number; /** Tailwind width/height classes that replace the fixed `size` (e.g. smaller on a phone); `size` is then only the picture's intrinsic size. */ sizeClassName?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const box = sizeClassName ? undefined : { width: size, height: size };
  const extra = `${sizeClassName ?? ""} ${className}`;

  if (failed) {
    return (
      <span aria-hidden="true" style={{ ...box, fontSize: Math.max(10, Math.round(size * 0.5)) }} className={`inline-flex shrink-0 items-center justify-center rounded-md bg-white/5 font-semibold text-muted ${extra}`}>
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
      className={`shrink-0 rounded-md bg-white/5 object-contain ${extra}`}
    />
  );
}
