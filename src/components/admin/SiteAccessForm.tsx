"use client";

import { useState, useTransition } from "react";
import { saveSiteSwitchAction } from "@/app/admin/(console)/actions";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { SiteSwitchInfo } from "@/lib/jonnybot-admin";
import type { SwitchSource } from "@/lib/siteSwitchRule";
import { Card, Notice } from "./ui";

export type SwitchRow = SiteSwitchInfo & {
  /** Which environment variable can override this switch, and how it is set right now. */
  envName: string;
  source: SwitchSource;
};

/** The live site-access switches. A switch the environment forces open or closed shows that, and its toggle is dimmed: the environment wins. */
export function SiteAccessForm({ initial }: { initial: SwitchRow[] }) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function flip(key: string, next: boolean) {
    setError(null);
    start(async () => {
      const result = await saveSiteSwitchAction(key, next);
      if (!result.ok) setError(result.error);
      else setRows((prev) => prev.map((r) => ({ ...r, enabled: result.data.find((d) => d.key === r.key)?.enabled ?? r.enabled })));
    });
  }

  return (
    <div className="space-y-6">
      <Card
        title="Who can open each part of the site"
        hint="Closed means only the clan's admins and the trusted beta servers' admins get in; open means everyone. A change takes effect within about a minute."
      >
        <ul className="space-y-5">
          {rows.map((row) => {
            const forced = row.source !== "live";
            return (
              <li key={row.key}>
                <Toggle
                  checked={forced ? row.source === "env-open" : row.enabled}
                  onChange={(next) => flip(row.key, next)}
                  disabled={pending || forced}
                  label={row.label}
                  detail={
                    <>
                      {row.description}
                      {forced && (
                        <span className="mt-1 block text-gold">
                          Held {row.source === "env-open" ? "open" : "closed"} by the {row.envName} setting on the server, which wins over this switch. Remove that setting to use the switch
                          {row.source === "env-closed" ? " (this is the kill switch: set to false it keeps the part shut)" : ""}.
                        </span>
                      )}
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      </Card>
      {error && <Notice tone="error" title={error} />}
    </div>
  );
}
