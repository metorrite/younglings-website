import type { ReactNode } from "react";

/** The small line icons in the dashboard's sidebar. Drawn on a 24-unit grid with the current text colour. */
const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  sliders: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  wand: <path d="M4 20L15 9M18 3v4M16 5h4M20 11v3M18.5 12.5h3M9 3v3M7.5 4.5h3" />,
  terminal: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10l3 2-3 2M12 15h5" />
    </>
  ),
  bell: <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 19a2 2 0 004 0" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c1 2 3 3 4 3s3-1 4-3M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  ticket: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </>
  ),
  poll: <path d="M5 20V11M12 20V4M19 20v-6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  swap: <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-[18px] w-[18px]" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {PATHS[name]}
    </svg>
  );
}
