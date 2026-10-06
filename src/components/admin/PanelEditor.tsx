"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePanelAction, postPanelAction, savePanelAction } from "@/app/admin/(console)/tickets/actions";
import type { FieldKind, GuildStructure, PanelDefinition, PanelField, PanelOption } from "@/lib/jonnybot-admin";
import { CategorySelect, ChannelSelect, RoleMultiSelect, RoleSelect } from "./pickers";
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
      fields: [...p.fields, { uid: nextUid(), label: "", kind: "SHORT", required: true, placeholder: null, maxLength: null, options: [] }],
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
        <FormField label="Opening message" hint="The line posted above every new ticket. {user} becomes a mention of whoever opened it. Leave it empty for “{user} Welcome”.">
          <input className={inputClass} value={panel.openingMessage} maxLength={500} placeholder="{user} Welcome" onChange={(e) => set("openingMessage", e.target.value)} />
        </FormField>
        <FormField label="Support message" hint="The text in the first embed of every ticket. Leave it empty for the standard “Support will be with you shortly” text.">
          <textarea className={`${inputClass} min-h-20`} value={panel.welcomeText} maxLength={1000} placeholder={"Support will be with you shortly.\nTo close this press the close button."} onChange={(e) => set("welcomeText", e.target.value)} />
        </FormField>

        <div>
          <p className="mb-2 text-sm font-medium">How a new ticket will look</p>
          <div className="space-y-2 rounded-lg border border-surface-border bg-background/60 p-3 text-sm">
            <p>
              {(panel.openingMessage.trim() || "{user} Welcome").split("{user}").flatMap((part, i, all) => (i < all.length - 1 ? [part, <span key={i} className="rounded bg-[#5865f2]/30 px-1 text-[#c9cdfb]">@Member</span>] : [part]))}
            </p>
            <div className="rounded border-l-4 border-gold bg-surface p-3">
              <p className="whitespace-pre-wrap">{panel.welcomeText.trim() || "Support will be with you shortly.\nTo close this press the close button."}</p>
              <p className="mt-2 text-xs text-muted">Opened by @Member · Ticket #0001</p>
            </div>
            {panel.fields.length > 0 && (
              <div className="space-y-2 rounded border-l-4 border-gold bg-surface p-3">
                {panel.fields.slice(0, 3).map((field, i) => (
                  <div key={i}>
                    <p className="font-semibold">{field.label || "Question"}</p>
                    <p className="mt-1 rounded bg-black/30 px-2 py-1 font-mono text-xs text-muted">their answer appears here</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <span className="rounded bg-emerald-600/80 px-3 py-1 text-xs font-medium text-white">Join as helper</span>
              <span className="rounded bg-red-600/80 px-3 py-1 text-xs font-medium text-white">Close</span>
            </div>
          </div>
        </div>
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
                  onChange={(e) => setField(field.uid, { kind: e.target.value as FieldKind })}
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
