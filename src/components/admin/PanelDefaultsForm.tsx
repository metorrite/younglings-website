"use client";

import { useState, useTransition } from "react";
import { savePanelDefaultsAction } from "@/app/admin/(console)/tickets/actions";
import type { GuildStructure, PanelDefaults } from "@/lib/jonnybot-admin";
import { CategorySelect, RoleMultiSelect, RoleSelect } from "./pickers";
import { ClosingFields, MessageFields } from "./TicketSharedFields";
import { Card, FormField, inputClass, Notice, primaryButton } from "./ui";

/**
 * What every new panel starts with. Saving changes only panels created afterwards, and each panel can still add, change
 * or remove any of it, so this is a time-saver rather than a rule.
 */
export function PanelDefaultsForm({ initial, structure }: { initial: PanelDefaults; structure: GuildStructure }) {
  const [defaults, setDefaults] = useState(initial);
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof PanelDefaults>(key: K, value: PanelDefaults[K]) => {
    setSaved(false);
    setDefaults((d) => ({ ...d, [key]: value }));
  };
  const roles = structure.roles;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await savePanelDefaultsAction(defaults);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      setDefaults(result.data);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Staff and helpers" hint="Added to every new panel. Staff roles can close any ticket and don't count against the helper limit; helpers can see every ticket and join.">
        <FormField label="Staff roles" hint="For example Owner, Admin, Support and Mod.">
          <RoleMultiSelect roles={roles} value={defaults.staffRoleIds} onChange={(ids) => set("staffRoleIds", ids)} />
        </FormField>
        <FormField label="Helper roles">
          <RoleMultiSelect roles={roles} value={defaults.helperRoleIds} onChange={(ids) => set("helperRoleIds", ids)} />
        </FormField>
        <FormField label="Role pinged when a ticket opens" hint="Used when the dropdown choice doesn't name its own role.">
          <RoleSelect roles={roles} value={defaults.defaultPingRoleId} onChange={(id) => set("defaultPingRoleId", id)} none="Nobody" />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={defaults.helperCap !== null} onChange={(e) => set("helperCap", e.target.checked ? 2 : null)} />
              Members join as helpers
            </label>
            {defaults.helperCap !== null ? (
              <FormField label="Helpers per ticket">
                <input
                  type="number"
                  min={1}
                  max={25}
                  className={inputClass}
                  value={defaults.helperCap}
                  onChange={(e) => set("helperCap", Number(e.target.value) || 1)}
                />
              </FormField>
            ) : (
              <p className="text-xs text-muted">Off: no Join button.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={defaults.escalationHours !== null} onChange={(e) => set("escalationHours", e.target.checked ? 72 : null)} />
              Escalate unanswered tickets
            </label>
            {defaults.escalationHours !== null ? (
              <>
                <FormField label="Hours without a helper">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    className={inputClass}
                    value={defaults.escalationHours}
                    onChange={(e) => set("escalationHours", Number(e.target.value) || 1)}
                  />
                </FormField>
                <FormField label="Default escalation role">
                  <RoleSelect roles={roles} value={defaults.defaultEscalateRoleId} onChange={(id) => set("defaultEscalateRoleId", id)} none="Nobody" />
                </FormField>
              </>
            ) : (
              <p className="text-xs text-muted">Off: unanswered tickets are never re-pinged.</p>
            )}
          </div>
        </div>
      </Card>

      <Card title="Who can close a ticket" hint="The Close button sits at the bottom of every ticket. Staff roles and admins can always use it.">
        <ClosingFields
          value={{ closeByRequester: defaults.closeByRequester, closeByHelpers: defaults.closeByHelpers, closeRoleIds: defaults.closeRoleIds }}
          onChange={(change) => {
            setSaved(false);
            setDefaults((d) => ({ ...d, ...change }));
          }}
          roles={roles}
        />
      </Card>

      <Card title="Ticket channels">
        <FormField label="Category" hint="Ticket channels are created inside this category.">
          <CategorySelect categories={structure.categories} value={defaults.categoryId} onChange={(id) => set("categoryId", id)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Channel name" hint="{number}, {user} and {type} are filled in.">
            <input className={inputClass} value={defaults.channelNameTemplate} maxLength={60} onChange={(e) => set("channelNameTemplate", e.target.value)} />
          </FormField>
          <FormField label="Open tickets per person">
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={defaults.perUserLimit}
              onChange={(e) => set("perUserLimit", Number(e.target.value) || 1)}
            />
          </FormField>
          <FormField label="Button label">
            <input className={inputClass} value={defaults.buttonLabel} maxLength={80} onChange={(e) => set("buttonLabel", e.target.value)} />
          </FormField>
        </div>
      </Card>

      <Card title="The ticket message" hint="The wording every new panel starts with.">
        <MessageFields
          value={{ openingMessage: defaults.openingMessage, welcomeText: defaults.welcomeText }}
          onChange={(change) => {
            setSaved(false);
            setDefaults((d) => ({ ...d, ...change }));
          }}
          panelTitle=""
          questions={[]}
          pingsRole={defaults.defaultPingRoleId !== null}
          usesHelpers={defaults.helperCap !== null}
        />
      </Card>

      {error && <Notice tone="error" title={error.message} items={error.problems} />}
      {saved && <Notice tone="success" title="Defaults saved. New panels start with these." />}

      <button type="button" className={primaryButton} disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save defaults"}
      </button>
    </div>
  );
}
