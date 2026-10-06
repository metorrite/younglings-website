"use client";

import { useState, useTransition } from "react";
import { saveClanWebsiteAction, saveSiteOptionsAction } from "@/app/admin/(console)/actions";
import { Card, FormField, inputClass, Notice, primaryButton } from "./ui";

/** The clan's website — the same setting as the Website Link button in Discord's /configure. */
export function ClanWebsiteForm({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <Card title="Clan website" hint="If your clan has a website, put its address here. The clan name at the top of /rs in Discord becomes a link to it. This is the same setting as Clan Setup in /configure. Leave it empty to remove the link.">
        <FormField label="Website address">
          <input
            className={inputClass}
            value={value}
            maxLength={300}
            placeholder="https://your-clan-site.com"
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
          />
        </FormField>
      </Card>
      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title="Saved." />}
      <button
        type="button"
        className={primaryButton}
        disabled={pending}
        onClick={() => {
          setError(null);
          setSaved(false);
          start(async () => {
            const result = await saveClanWebsiteAction(value);
            if (!result.ok) return setError(result.error);
            setValue(result.data.websiteUrl ?? "");
            setSaved(true);
          });
        }}
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

/** Options for how the public website behaves. */
export function SiteOptionsForm({ navEventBubble }: { navEventBubble: boolean }) {
  const [bubble, setBubble] = useState(navEventBubble);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <Card title="Notifications" hint="The bell in the navigation bar always lists what's new: events, polls, signups, announcements and site updates.">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 accent-[var(--color-gold)]"
            checked={bubble}
            onChange={(e) => {
              setBubble(e.target.checked);
              setSaved(false);
            }}
          />
          <span>
            <span className="font-medium">Also show a bubble on the Events menu</span>
            <span className="mt-0.5 block text-muted">When a new event, signup, poll or calendar event has been added since a visitor last looked, the Events menu gets a small bubble with the count. Opening the bell or visiting the Events menu clears it in both places.</span>
          </span>
        </label>
      </Card>
      {error && <Notice tone="error" title={error} />}
      {saved && <Notice tone="success" title="Saved." />}
      <button
        type="button"
        className={primaryButton}
        disabled={pending}
        onClick={() => {
          setError(null);
          setSaved(false);
          start(async () => {
            const result = await saveSiteOptionsAction(bubble);
            if (!result.ok) return setError(result.error);
            setBubble(result.data.navEventBubble);
            setSaved(true);
          });
        }}
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
