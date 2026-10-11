"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FEATURES } from "@/lib/jonnybotFeatures";

/**
 * The landing page's centrepiece: the logo in the middle, feature cards floating around it. Every few seconds one card is
 * swapped for the next feature nobody is showing, so over time every feature gets a turn. Below the large-screen width the
 * cards sit in a grid under the logo instead of floating. With reduced motion requested they stay put.
 */

const SLOTS: { place: string; drift: CSSProperties }[] = [
  { place: "lg:left-[1%] lg:top-[4%]", drift: { "--jb-dur": "9s", "--jb-dx": "8px", "--jb-dy": "-12px", "--jb-tilt": "-1.5deg" } as CSSProperties },
  { place: "lg:right-[1%] lg:top-[8%]", drift: { "--jb-dur": "11s", "--jb-delay": "-3s", "--jb-dx": "-10px", "--jb-dy": "-9px", "--jb-tilt": "1.5deg" } as CSSProperties },
  { place: "lg:left-[-2%] lg:top-[36%]", drift: { "--jb-dur": "10s", "--jb-delay": "-5s", "--jb-dx": "10px", "--jb-dy": "10px", "--jb-tilt": "1deg" } as CSSProperties },
  { place: "lg:right-[-2%] lg:top-[38%]", drift: { "--jb-dur": "8s", "--jb-delay": "-1s", "--jb-dx": "-8px", "--jb-dy": "12px", "--jb-tilt": "-1deg" } as CSSProperties },
  { place: "lg:left-[5%] lg:bottom-[0%]", drift: { "--jb-dur": "12s", "--jb-delay": "-7s", "--jb-dx": "12px", "--jb-dy": "-8px", "--jb-tilt": "1.5deg" } as CSSProperties },
  { place: "lg:right-[5%] lg:bottom-[0%]", drift: { "--jb-dur": "9.5s", "--jb-delay": "-4s", "--jb-dx": "-12px", "--jb-dy": "-10px", "--jb-tilt": "-1.5deg" } as CSSProperties },
];

const SWAP_EVERY_MS = 3800;

export function FeatureOrbit({ children }: { children: ReactNode }) {
  // which feature each slot is showing; the first few to begin with
  const [shown, setShown] = useState<number[]>(() => SLOTS.map((_, i) => i));
  const turn = useRef(0);
  const pointer = useRef(SLOTS.length);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      const slot = turn.current++ % SLOTS.length;
      setShown((current) => {
        // the next feature, in order, that no card is showing right now
        for (let k = 0; k < FEATURES.length; k++) {
          const candidate = (pointer.current + k) % FEATURES.length;
          if (current.includes(candidate)) continue;
          pointer.current = candidate + 1;
          const updated = [...current];
          updated[slot] = candidate;
          return updated;
        }
        return current;
      });
    }, SWAP_EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:h-[34rem]">
      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
        <div className="relative">
          <div aria-hidden="true" className="jb-glow absolute -inset-16" />
          <Image src="/clan-logo.png" alt="JonnyBot" width={224} height={224} priority className="relative h-44 w-44 rounded-full sm:h-56 sm:w-56" />
        </div>
        {children}
      </div>

      <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:block" aria-label="What JonnyBot does">
        {SLOTS.map((slot, i) => {
          const feature = FEATURES[shown[i]];
          return (
            <li key={i} className={`lg:absolute lg:w-64 ${slot.place}`}>
              <div className="jb-drift" style={slot.drift}>
                <div key={shown[i]} className="jb-swap h-full rounded-xl border border-surface-border bg-surface/90 p-4 shadow-lg shadow-black/30 backdrop-blur">
                  <p className="flex items-center gap-2 font-semibold">
                    <span aria-hidden="true">{feature.icon}</span>
                    {feature.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">{feature.blurb}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
