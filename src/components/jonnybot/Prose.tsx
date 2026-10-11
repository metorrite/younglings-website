import type { ReactNode } from "react";

/** Shared page furniture for JonnyBot's text pages (docs, install, FAQ, privacy, terms). */

export function Page({ title, intro, children, wide = false }: { title: string; intro?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto px-4 pt-12 sm:px-6 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
      <div className="mt-8 space-y-10">{children}</div>
    </div>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-xl font-semibold text-gold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-[#cfd3da] [&_a]:text-gold [&_a]:underline-offset-2 hover:[&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
        {children}
      </div>
    </section>
  );
}
