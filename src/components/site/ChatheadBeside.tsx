"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { RsChathead } from "@/components/site/RsChathead";

/**
 * A chathead as tall as the block of text beside it: the name, rank, dates and badges on a member's profile. CSS can't
 * make a square out of a height it only learns once the row is laid out, so this measures the text block and sizes the
 * head to match, following it as the text wraps or changes. The head is capped (smaller on a phone, where that text
 * stacks up tall) and never smaller than 56px. Until it has measured, the head is drawn at 80px.
 */
export function ChatheadBeside({ rsn, children }: { rsn: string; children: ReactNode }) {
  const textRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(80);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => setHeight(Math.round(el.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <RsChathead rsn={rsn} size={Math.max(56, height)} className="max-h-24 max-w-24 sm:max-h-44 sm:max-w-44" />
      <div ref={textRef} className="min-w-0">
        {children}
      </div>
    </div>
  );
}
