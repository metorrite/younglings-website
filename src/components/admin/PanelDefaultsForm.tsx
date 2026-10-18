"use client";

import { useState, useTransition } from "react";
import { savePanelDefaultsAction } from "@/app/admin/(console)/tickets/actions";
import type { GuildStructure, PanelDefaults } from "@/lib/jonnybot-admin";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { CategorySelect, RoleMultiSelect, RoleSelect } from "./pickers";
import { ClosingFields, MessageFields } from "./TicketSharedFields";
import { FormField, inputClass } from "./ui";

type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

/**
 * What every new panel starts with. Saving changes only panels created afterwards, and each panel can still add, change
 * or remove any of it, so this is a time-saver rather than a rule.
 * <p>
 * Basic is the staff, helper and ping roles and the category. Advanced adds helpers joining and escalation, who can close, the channel name, the limit per
 * person, the button label and the ticket wording. What is already saved stays visible in Basic.
 */
export function PanelDefaultsForm({ initial, structure, save: persist = savePanelDefaultsAction }: { initial: PanelDefaults; structure: GuildStructure; save?: typeof savePanelDefaultsAction }) {
  const [baseline, setBaseline] = useState(initial);
  const [defaults, setDefaults] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";
  const dirty = JSON.stringify(defaults) !== JSON.stringify(baseline);

  const set = <K extends keyof PanelDefaults>(key: K, value: PanelDefaults[K]) => {
    setOutcome(null);
    setDefaults((d) => ({ ...d, [key]: value }));
  };
  const roles = structure.roles;

  const showHelping = advanced || baseline.helperCap !== null || baseline.escalationHours !== null;
  const showMessage = advanced || baseline.openingMessage.trim() !== "" || baseline.welcomeText.trim() !== "";
  const hidden = [
    !showHelping && "helpers joining and escalation",
    !advanced && "who can close a ticket",
    !advanced && "the channel name, tickets per person and button label",
    !showMessage && "the wording of the ticket message",
  ].filter((name): name is string => typeof name === "string");

  function submit() {
    setOutcome(null);
    startTransition(async () => {
      const result = await persist(defaults);
      if (!result.ok) {
        setOutcome({ tone: "error", title: result.error, items: result.problems });
        return;
      }
      setDefaults(result.data);
      setBaseline(result.data);
      setOutcome({ tone: "success", title: "Defaults saved. New panels start with these." });
    });
  }

  return (
    <div className="space-y-4">
      <PanelGrid min="24rem">
        <CollapsibleCard
          id="tpd-staff"
          title="Staff and helpers"
          hint="Added to every new panel. Staff roles can close any ticket and don't count against the helper limit; helpers can see every ticket and join."
          defaultOpen
          summary={
            <Chip tone={defaults.staffRoleIds.length + defaults.helperRoleIds.length === 0 ? "warn" : "good"}>
              {defaults.staffRoleIds.length} staff, {defaults.helperRoleIds.length} helper roles
            </Chip>
          }
        >
          <FormField as="group" label="Staff roles" size="lg" hint="For example Owner, Admin, Support and Mod.">
            <RoleMultiSelect roles={roles} value={defaults.staffRoleIds} onChange={(ids) => set("staffRoleIds", ids)} />
          </FormField>
          <FormField as="group" label="Helper roles" size="lg">
            <RoleMultiSelect roles={roles} value={defaults.helperRoleIds} onChange={(ids) => set("helperRoleIds", ids)} />
          </FormField>
          <FormField label="Role pinged when a ticket opens" size="md" hint="Used when the dropdown choice doesn't name its own role.">
            <RoleSelect roles={roles} value={defaults.defaultPingRoleId} onChange={(id) => set("defaultPingRoleId", id)} none="Nobody" />
          </FormField>
          {showHelping && (
            <PanelGrid min="18rem" gap="gap-3">
              <SettingRow
                title="Members join as helpers"
                checked={defaults.helperCap !== null}
                onChange={(on) => set("helperCap", on ? 2 : null)}
                offHint="Off: no Join button."
              >
                <FormField label="Helpers per ticket" size="sm">
                  <input
                    type="number"
                    min={1}
                    max={25}
                    className={inputClass}
                    value={defaults.helperCap ?? 1}
                    onChange={(e) => set("helperCap", Number(e.target.value) || 1)}
                  />
                </FormField>
              </SettingRow>
              <SettingRow
                title="Escalate unanswered tickets"
                checked={defaults.escalationHours !== null}
                onChange={(on) => set("escalationHours", on ? 72 : null)}
                offHint="Off: unanswered tickets are never re-pinged."
              >
                <FormField label="Hours without a helper" size="sm">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    className={inputClass}
                    value={defaults.escalationHours ?? 1}
                    onChange={(e) => set("escalationHours", Number(e.target.value) || 1)}
                  />
                </FormField>
                <FormField label="Default escalation role" size="md">
                  <RoleSelect roles={roles} value={defaults.defaultEscalateRoleId} onChange={(id) => set("defaultEscalateRoleId", id)} none="Nobody" />
                </FormField>
              </SettingRow>
            </PanelGrid>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          id="tpd-channels"
          title="Ticket channels"
          hint="Where new tickets are made."
          defaultOpen
          summary={<Chip tone={defaults.categoryId ? "good" : "plain"}>{defaults.categoryId ? (structure.categories.find((c) => c.id === defaults.categoryId)?.name ?? "A category") : "No category"}</Chip>}
        >
          <FieldGrid>
            <FormField label="Category" size="md" hint="Ticket channels are created inside this category.">
              <CategorySelect categories={structure.categories} value={defaults.categoryId} onChange={(id) => set("categoryId", id)} />
            </FormField>
            {advanced && (
              <>
                <FormField label="Channel name" size="md" hint="{number}, {user} and {type} are filled in.">
                  <input className={inputClass} value={defaults.channelNameTemplate} maxLength={60} onChange={(e) => set("channelNameTemplate", e.target.value)} />
                </FormField>
                <FormField label="Open tickets per person" size="sm">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className={inputClass}
                    value={defaults.perUserLimit}
                    onChange={(e) => set("perUserLimit", Number(e.target.value) || 1)}
                  />
                </FormField>
                <FormField label="Button label" size="md">
                  <input className={inputClass} value={defaults.buttonLabel} maxLength={80} onChange={(e) => set("buttonLabel", e.target.value)} />
                </FormField>
              </>
            )}
          </FieldGrid>
        </CollapsibleCard>

        {advanced && (
          <CollapsibleCard
            id="tpd-closing"
            title="Who can close a ticket"
            hint="The Close button sits at the bottom of every ticket. Staff roles and admins can always use it."
            summary={
              <Chip>
                {[defaults.closeByRequester && "The member", defaults.closeByHelpers && "Helpers", defaults.closeRoleIds.length > 0 && `${defaults.closeRoleIds.length} role${defaults.closeRoleIds.length === 1 ? "" : "s"}`].filter(Boolean).join(", ") || "Staff only"}
              </Chip>
            }
          >
            <ClosingFields
              value={{ closeByRequester: defaults.closeByRequester, closeByHelpers: defaults.closeByHelpers, closeRoleIds: defaults.closeRoleIds }}
              onChange={(change) => {
                setOutcome(null);
                setDefaults((d) => ({ ...d, ...change }));
              }}
              roles={roles}
            />
          </CollapsibleCard>
        )}

        {showMessage && (
          <CollapsibleCard
            id="tpd-message"
            title="The ticket message"
            hint="The wording every new panel starts with."
            summary={<Chip>{defaults.openingMessage.trim() || defaults.welcomeText.trim() ? "Own wording" : "Standard wording"}</Chip>}
          >
            <MessageFields
              value={{ openingMessage: defaults.openingMessage, welcomeText: defaults.welcomeText }}
              onChange={(change) => {
                setOutcome(null);
                setDefaults((d) => ({ ...d, ...change }));
              }}
              panelTitle=""
              questions={[]}
              pingsRole={defaults.defaultPingRoleId !== null}
              usesHelpers={defaults.helperCap !== null}
            />
          </CollapsibleCard>
        )}
      </PanelGrid>

      {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}

      <SaveBar
        pending={pending}
        onSave={submit}
        outcome={outcome}
        dirty={dirty}
        label="Save defaults"
        onDiscard={() => {
          setDefaults(baseline);
          setOutcome(null);
        }}
      />
    </div>
  );
}
