"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePanelAction, postPanelAction, savePanelAction } from "@/app/admin/(console)/tickets/actions";
import type { FieldKind, FieldPurpose, GuildStructure, HelpKind, PanelDefinition, PanelField, PanelOption } from "@/lib/jonnybot-admin";
import { CategorySelect, ChannelSelect, RoleMultiSelect, RoleSelect } from "./pickers";
import { ClosingFields, MessageFields } from "./TicketSharedFields";
import { Card, dangerButton, FormField, ghostButton, inputClass, Notice, primaryButton } from "./ui";

const MAX_FIELDS = 5; // Discord forms hold at most 5 inputs
const MAX_OPTIONS = 25;

type EditorOption = PanelOption & { uid: number };
type EditorField = Omit<PanelField, "options"> & { uid: number; options: EditorOption[] };
type EditorPanel = Omit<PanelDefinition, "fields"> & { fields: EditorField[] };

const KIND_LABELS: Record<FieldKind, string> = {
  SHORT: "Short answer",
  PARAGRAPH: "Long answer",
  SELECT: "Dropdown",
  CHECKBOX: "Yes / no checkbox",
};

const HELP_KIND_LABELS: Record<HelpKind, string> = {
  NONE: "Ordinary ticket",
  PVM: "PvM Help",
  CA: "CA Help",
};

const PURPOSE_LABELS: Record<FieldPurpose, string> = {
  NONE: "Nothing special",
  TIER: "The tier they pick",
  ATTEMPTS: "Their earlier attempts",
};

/** Keys for list rows, so editing or reordering a question doesn't scramble the inputs React keeps for it. */
let uidCounter = 0;
const nextUid = () => ++uidCounter;

export function PanelEditor({ initial, structure }: { initial: PanelDefinition; structure: GuildStructure }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [panel, setPanel] = useState<EditorPanel>(() => ({
    ...initial,
    fields: initial.fields.map((f) => ({ ...f, uid: nextUid(), options: f.options.map((o) => ({ ...o, uid: nextUid() })) })),
  }));
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [postChannel, setPostChannel] = useState<string | null>(initial.postedChannelId ?? null);

  const isNew = saved.id === undefined;
  const roles = structure.roles;

  const set = <K extends keyof EditorPanel>(key: K, value: EditorPanel[K]) => setPanel((p) => ({ ...p, [key]: value }));
  const setField = (uid: number, change: Partial<EditorField>) =>
    setPanel((p) => ({ ...p, fields: p.fields.map((f) => (f.uid === uid ? { ...f, ...change } : f)) }));
  const setOption = (fieldUid: number, optionUid: number, change: Partial<EditorOption>) =>
    setPanel((p) => ({
      ...p,
      fields: p.fields.map((f) =>
        f.uid === fieldUid ? { ...f, options: f.options.map((o) => (o.uid === optionUid ? { ...o, ...change } : o)) } : f,
      ),
    }));

  const addField = () =>
    setPanel((p) => ({
      ...p,
      fields: [...p.fields, { uid: nextUid(), label: "", kind: "SHORT", required: true, placeholder: null, maxLength: null, purpose: "NONE", options: [] }],
    }));
  const moveField = (index: number, by: -1 | 1) =>
    setPanel((p) => {
      const target = index + by;
      if (target < 0 || target >= p.fields.length) return p;
      const fields = [...p.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...p, fields };
    });

  function save() {
    setError(null);
    setNotice(null);
    const payload: PanelDefinition = {
      ...panel,
      fields: panel.fields.map((field) => ({
        label: field.label,
        kind: field.kind,
        required: field.required,
        placeholder: field.placeholder,
        maxLength: field.maxLength,
        purpose: field.purpose,
        options: field.options.map((option) => ({ label: option.label, pingRoleId: option.pingRoleId, escalateRoleId: option.escalateRoleId })),
      })),
    };
    startTransition(async () => {
      const result = await savePanelAction(saved.id ?? null, payload);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      if (isNew) {
        router.push(`/admin/tickets/panels/${result.data.id}`);
        return;
      }
      setSaved(result.data);
      setNotice("Saved. If this panel is already posted, its message has been updated.");
      router.refresh();
    });
  }

  function remove() {
    if (!saved.id || !window.confirm(`Delete the panel "${saved.name}"? Closed tickets and transcripts are kept.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePanelAction(saved.id!);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      router.push("/admin/tickets");
    });
  }

  function post() {
    if (!saved.id || !postChannel) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await postPanelAction(saved.id!, postChannel);
      if (!result.ok) {
        setError({ message: result.error, problems: result.problems });
        return;
      }
      setSaved(result.data);
      setNotice("Posted. Members can now open tickets from that message.");
      router.refresh();
    });
  }

  const postedChannel = structure.channels.find((c) => c.id === saved.postedChannelId);

  return (
    <div className="space-y-6">
      <Card title="The panel" hint="The message members see, with the button that opens a ticket.">
        <FormField label="Name" hint="For your own reference — members don't see it. Must be unique.">
          <input className={inputClass} value={panel.name} maxLength={60} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Title">
          <input className={inputClass} value={panel.title} maxLength={100} onChange={(e) => set("title", e.target.value)} />
        </FormField>
        <FormField
          label="Description"
          hint={
            <>
              Supports JonnyBot&apos;s post tags, e.g. <code>~&lt;LS&gt;~</code> for a divider and <code>~&lt;COLOR-ff9900&gt;~</code> for an accent colour.
            </>
          }
        >
          <textarea className={`${inputClass} min-h-32`} value={panel.description} maxLength={2500} onChange={(e) => set("description", e.target.value)} />
        </FormField>
        <FormField
          label="Help type"
          hint={
            <>
              PvM Help and CA Help tickets follow the <a className="text-gold hover:underline" href="/admin/pvm-help">PvM Help rules</a>: members ping helpers and escalate, guests ping nobody, and a
              guest asking for Master or Grandmaster must describe earlier attempts. A CA Help panel also needs a required dropdown marked as the tier below.
            </>
          }
        >
          <select className={inputClass} value={panel.helpKind} onChange={(e) => {
              const helpKind = e.target.value as HelpKind;
              // Marks only mean something on a help panel, so an ordinary panel clears them.
              setPanel((p) => ({ ...p, helpKind, fields: helpKind === "NONE" ? p.fields.map((f) => ({ ...f, purpose: "NONE" })) : p.fields }));
            }}>
            {(Object.keys(HELP_KIND_LABELS) as HelpKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {HELP_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Button label">
            <input className={inputClass} value={panel.buttonLabel} maxLength={80} onChange={(e) => set("buttonLabel", e.target.value)} />
          </FormField>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={panel.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            Enabled <span className="text-xs text-muted">(a disabled panel&apos;s button can&apos;t be used)</span>
          </label>
        </div>
      </Card>

      <Card title="Ticket channels" hint="What happens when someone opens a ticket.">
        <FormField label="Category" hint="Ticket channels are created inside this category.">
          <CategorySelect categories={structure.categories} value={panel.categoryId} onChange={(id) => set("categoryId", id)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Channel name" hint="{number}, {user} and {type} are filled in. Example: ca-{number}">
            <input className={inputClass} value={panel.channelNameTemplate} maxLength={60} onChange={(e) => set("channelNameTemplate", e.target.value)} />
          </FormField>
          <FormField label="Open tickets per person" hint="Per panel.">
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={panel.perUserLimit}
              onChange={(e) => set("perUserLimit", Number(e.target.value) || 1)}
            />
          </FormField>
        </div>
      </Card>

      <Card title="The ticket message" hint="What a member sees at the top of the private channel their ticket opens in. Laid out like Ticket Tool's.">
        <MessageFields
          value={{ openingMessage: panel.openingMessage, welcomeText: panel.welcomeText }}
          onChange={(change) => setPanel((p) => ({ ...p, ...change }))}
          panelTitle={panel.title}
          questions={panel.fields.map((f) => f.label)}
          pingsRole={panel.defaultPingRoleId !== null || panel.fields.some((f) => f.options.some((o) => o.pingRoleId !== null))}
          usesHelpers={panel.helperCap !== null}
        />
      </Card>

      <Card
        title="Who handles tickets"
        hint="Helpers can see every ticket on this panel and join to help. Staff can also close any ticket and don't count against the helper limit."
      >
        <FormField label="Helper roles">
          <RoleMultiSelect roles={roles} value={panel.helperRoleIds} onChange={(ids) => set("helperRoleIds", ids)} />
        </FormField>
        <FormField label="Staff roles">
          <RoleMultiSelect roles={roles} value={panel.staffRoleIds} onChange={(ids) => set("staffRoleIds", ids)} />
        </FormField>
        <FormField label="Role pinged when a ticket opens" hint="Used when the dropdown choice doesn't name its own role.">
          <RoleSelect roles={roles} value={panel.defaultPingRoleId} onChange={(id) => set("defaultPingRoleId", id)} none="Nobody" />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={panel.helperCap !== null}
                onChange={(e) => set("helperCap", e.target.checked ? 2 : null)}
              />
              Members join as helpers
            </label>
            {panel.helperCap !== null ? (
              <FormField label="Helpers per ticket" hint="A Join button appears; staff aren't limited.">
                <input
                  type="number"
                  min={1}
                  max={25}
                  className={inputClass}
                  value={panel.helperCap}
                  onChange={(e) => set("helperCap", Number(e.target.value) || 1)}
                />
              </FormField>
            ) : (
              <p className="text-xs text-muted">Off: no Join button — tickets are handled by whoever is in the channel.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={panel.escalationHours !== null}
                onChange={(e) => set("escalationHours", e.target.checked ? 24 : null)}
              />
              Escalate unanswered tickets
            </label>
            {panel.escalationHours !== null ? (
              <>
                <FormField label="Hours without a helper" hint="After this, the escalation role is pinged once.">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    className={inputClass}
                    value={panel.escalationHours}
                    onChange={(e) => set("escalationHours", Number(e.target.value) || 1)}
                  />
                </FormField>
                <FormField label="Default escalation role" hint="A dropdown choice can name its own.">
                  <RoleSelect roles={roles} value={panel.defaultEscalateRoleId} onChange={(id) => set("defaultEscalateRoleId", id)} none="Nobody" />
                </FormField>
              </>
            ) : (
              <p className="text-xs text-muted">Off: unanswered tickets are never re-pinged.</p>
            )}
          </div>
        </div>
      </Card>

      <Card
        title="Who can close a ticket"
        hint="The Close button sits at the bottom of every ticket. Staff roles and admins can always use it."
      >
        <ClosingFields
          value={{ closeByRequester: panel.closeByRequester, closeByHelpers: panel.closeByHelpers, closeRoleIds: panel.closeRoleIds }}
          onChange={(change) => setPanel((p) => ({ ...p, ...change }))}
          roles={roles}
        />
      </Card>

      <Card title="The form" hint={`Questions asked when someone opens a ticket (up to ${MAX_FIELDS}). Their answers are shown in the ticket.`}>
        {panel.fields.length === 0 && <p className="text-sm text-muted">No questions — the ticket opens straight away.</p>}

        {panel.fields.map((field, index) => (
          <div key={field.uid} className="space-y-3 rounded-md border border-surface-border bg-background/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Question {index + 1}</span>
              <div className="flex gap-1.5">
                <button type="button" className={ghostButton} disabled={index === 0} onClick={() => moveField(index, -1)} aria-label="Move up">
                  ↑
                </button>
                <button
                  type="button"
                  className={ghostButton}
                  disabled={index === panel.fields.length - 1}
                  onClick={() => moveField(index, 1)}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={dangerButton}
                  onClick={() => setPanel((p) => ({ ...p, fields: p.fields.filter((f) => f.uid !== field.uid) }))}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Question">
                <input className={inputClass} value={field.label} maxLength={45} onChange={(e) => setField(field.uid, { label: e.target.value })} />
              </FormField>
              <FormField label="Answer type">
                <select
                  className={inputClass}
                  value={field.kind}
                  onChange={(e) => setField(field.uid, { kind: e.target.value as FieldKind, purpose: "NONE" })}
                >
                  {(Object.keys(KIND_LABELS) as FieldKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" checked={field.required} onChange={(e) => setField(field.uid, { required: e.target.checked })} />
                Required
              </label>
              {(field.kind === "SHORT" || field.kind === "PARAGRAPH") && (
                <>
                  <div className="min-w-48 flex-1">
                    <FormField label="Placeholder">
                      <input
                        className={inputClass}
                        value={field.placeholder ?? ""}
                        maxLength={100}
                        onChange={(e) => setField(field.uid, { placeholder: e.target.value || null })}
                      />
                    </FormField>
                  </div>
                  <div className="w-32">
                    <FormField label="Max length">
                      <input
                        type="number"
                        min={1}
                        max={4000}
                        className={inputClass}
                        value={field.maxLength ?? ""}
                        onChange={(e) => setField(field.uid, { maxLength: e.target.value ? Number(e.target.value) : null })}
                      />
                    </FormField>
                  </div>
                </>
              )}
            </div>

            {panel.helpKind !== "NONE" && (field.kind === "SELECT" || field.kind === "SHORT" || field.kind === "PARAGRAPH") && (
              <FormField
                label="Part in the help rules"
                hint={field.kind === "SELECT" ? "Mark the dropdown where they pick Easy, Medium, Master and so on." : "Mark the question where they describe what they have already tried."}
              >
                <select className={inputClass} value={field.purpose} onChange={(e) => setField(field.uid, { purpose: e.target.value as FieldPurpose })}>
                  <option value="NONE">{PURPOSE_LABELS.NONE}</option>
                  {field.kind === "SELECT" && <option value="TIER">{PURPOSE_LABELS.TIER}</option>}
                  {field.kind !== "SELECT" && <option value="ATTEMPTS">{PURPOSE_LABELS.ATTEMPTS}</option>}
                </select>
              </FormField>
            )}

            {field.kind === "SELECT" && (
              <div className="space-y-2 border-t border-surface-border pt-3">
                <p className="text-sm font-medium">Choices</p>
                <p className="text-xs text-muted">
                  Each choice can ping its own role when the ticket opens and name who to escalate to — that&apos;s how one panel can route to different helpers.
                </p>
                {field.options.map((option) => (
                  <div key={option.uid} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                      className={inputClass}
                      placeholder="Choice label"
                      value={option.label}
                      maxLength={100}
                      onChange={(e) => setOption(field.uid, option.uid, { label: e.target.value })}
                      aria-label="Choice label"
                    />
                    <RoleSelect
                      roles={roles}
                      value={option.pingRoleId}
                      onChange={(id) => setOption(field.uid, option.uid, { pingRoleId: id })}
                      none="Ping: panel default"
                    />
                    <RoleSelect
                      roles={roles}
                      value={option.escalateRoleId}
                      onChange={(id) => setOption(field.uid, option.uid, { escalateRoleId: id })}
                      none="Escalate to: panel default"
                    />
                    <button
                      type="button"
                      className={dangerButton}
                      onClick={() => setField(field.uid, { options: field.options.filter((o) => o.uid !== option.uid) })}
                      aria-label="Remove choice"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={ghostButton}
                  disabled={field.options.length >= MAX_OPTIONS}
                  onClick={() =>
                    setField(field.uid, { options: [...field.options, { uid: nextUid(), label: "", pingRoleId: null, escalateRoleId: null }] })
                  }
                >
                  + Add choice
                </button>
              </div>
            )}
          </div>
        ))}

        <button type="button" className={ghostButton} disabled={panel.fields.length >= MAX_FIELDS} onClick={addField}>
          + Add question
        </button>
      </Card>

      {error && <Notice tone="error" title={error.message} items={error.problems} />}
      {notice && <Notice tone="success" title={notice} />}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={pending} onClick={save}>
          {pending ? "Working…" : isNew ? "Create panel" : "Save changes"}
        </button>
        {!isNew && (
          <button type="button" className={dangerButton} disabled={pending} onClick={remove}>
            Delete panel
          </button>
        )}
      </div>

      {!isNew && (
        <Card
          title="Post the panel"
          hint={
            saved.postedChannelId ? (
              <>Currently posted in {postedChannel ? `#${postedChannel.name}` : "a channel"}. Posting to the same channel updates that message in place.</>
            ) : (
              "Not posted yet. Save your changes first — the posted message shows the saved version."
            )
          }
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <FormField label="Channel">
                <ChannelSelect channels={structure.channels} value={postChannel} onChange={setPostChannel} none="Choose a channel…" onlyPostable />
              </FormField>
            </div>
            <button type="button" className={primaryButton} disabled={pending || !postChannel} onClick={post}>
              {saved.postedChannelId && saved.postedChannelId === postChannel ? "Update posted panel" : "Post panel"}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
