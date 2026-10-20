"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

/**
 * Lets the pickers inside an `as="group"` FormField name themselves after the field's label. A group can't use a `label` element
 * (a click on blank space would hit the first button), so without this the `select` inside has no accessible name.
 */
const FieldLabelId = createContext<string | undefined>(undefined);

/** The id of the enclosing group field's label text, for `aria-labelledby` on a control inside it. */
export function useFieldLabelId(): string | undefined {
  return useContext(FieldLabelId);
}

export function GroupFieldShell({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <FieldLabelId.Provider value={id}>
      <div role="group" aria-label={label} className="block">
        {children}
      </div>
    </FieldLabelId.Provider>
  );
}

/** The label text; carries the id that a control inside a group field points at. Plain text outside a group. */
export function FieldLabelText({ children }: { children: ReactNode }) {
  const id = useContext(FieldLabelId);
  return <span id={id}>{children}</span>;
}
