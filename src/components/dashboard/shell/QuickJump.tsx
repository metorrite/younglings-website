"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { groupsFor } from "./nav";

/**
 * Press Ctrl+K (or Cmd+K), or the button, to jump to any page of the dashboard by typing a few letters of its name. Arrow keys move,
 * Enter opens, Escape closes. With dozens of settings pages this is faster than finding them in the sidebar.
 */
export function QuickJump({
  base,
  hasClan = true,
  isOwner = false,
}: {
  base: string;
  hasClan?: boolean;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const pages = useMemo(
    () =>
      groupsFor(hasClan, isOwner).flatMap((group) =>
        group.items
          .filter((item) => !item.soon && item.path !== undefined)
          .map((item) => ({
            label: item.label,
            icon: item.icon,
            group: group.title ?? "Dashboard",
            href: `${base}${item.path}`,
          })),
      ),
    [base, hasClan, isOwner],
  );
  const shown = pages.filter((p) =>
    `${p.label} ${p.group}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setIndex(0);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setQuery("");
          setIndex(0);
        }}
        className="flex w-full items-center gap-2 rounded-md border border-surface-border bg-background/60 px-3 py-2 text-left text-sm text-muted transition hover:border-gold hover:text-foreground"
      >
        <span aria-hidden>⌕</span>
        <span className="flex-1">Jump to…</span>
        <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-label="Jump to a page"
              className="w-full max-w-lg overflow-hidden rounded-xl border border-surface-border bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={input}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIndex((i) =>
                      Math.min(i + 1, Math.max(shown.length - 1, 0)),
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter" && shown[index]) {
                    go(shown[index].href);
                  }
                }}
                placeholder="Type a page name…"
                aria-label="Page name"
                className="w-full border-b border-surface-border bg-transparent px-4 py-3 text-sm outline-none"
              />
              <ul className="max-h-80 overflow-y-auto p-2">
                {shown.map((page, i) => (
                  <li key={page.href}>
                    <button
                      type="button"
                      onMouseEnter={() => setIndex(i)}
                      onClick={() => go(page.href)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${i === index ? "bg-gold/10 text-foreground [&_svg]:text-gold" : "text-muted"}`}
                    >
                      <Icon name={page.icon} />
                      <span className="flex-1">{page.label}</span>
                      <span className="text-xs text-muted">{page.group}</span>
                    </button>
                  </li>
                ))}
                {shown.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted">
                    No page matches that.
                  </li>
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
