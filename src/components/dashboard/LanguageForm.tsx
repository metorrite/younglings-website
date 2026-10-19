"use client";

import { useState, useTransition } from "react";
import { FormField, inputClass } from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import type { LanguageConfig, WelcomeActionResult } from "@/lib/jonnybot-admin";
import type { MessageKey } from "@/lib/i18n";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/** The text the page needs, already in the server's language (resolved on the server with `messagesFor`). */
export type LanguageTexts = Record<Extract<MessageKey, `dashboard.language.${string}`>, string>;

/** Which language JonnyBot uses for its messages in this server. One setting; the list is whatever languages the bot has. */
export function LanguageForm({ initial, texts, save }: { initial: LanguageConfig; texts: LanguageTexts; save: (language: string) => Promise<WelcomeActionResult<LanguageConfig>> }) {
  const [saved, setSaved] = useState(initial);
  const [language, setLanguage] = useState(initial.language);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, start] = useTransition();
  const dirty = language !== saved.language;

  function submit() {
    setOutcome(null);
    start(async () => {
      const result = await save(language);
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setSaved(result.data);
      setLanguage(result.data.language);
      setOutcome({ tone: "success", title: texts["dashboard.language.saved"] });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="20rem" max="max-content">
        <CollapsibleCard id="language-messages" title={texts["dashboard.language.panel"]} hint={texts["dashboard.language.description"]} defaultOpen summary={<Chip>{initial.languages.find((l) => l.code === saved.language)?.name ?? saved.language}</Chip>}>
          <div className="space-y-3">
            <FormField label={texts["dashboard.language.field"]} hint={texts["dashboard.language.hint"]} size="md">
              <select className={inputClass} value={language} onChange={(e) => { setLanguage(e.target.value); setOutcome(null); }}>
                {initial.languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </FormField>
            {initial.languages.length <= 1 && <p className="text-xs text-muted">{texts["dashboard.language.only"]}</p>}
          </div>
        </CollapsibleCard>
      </PanelGrid>
      <SaveBar pending={pending} onSave={submit} outcome={outcome} dirty={dirty} onDiscard={() => { setLanguage(saved.language); setOutcome(null); }} />
    </div>
  );
}
