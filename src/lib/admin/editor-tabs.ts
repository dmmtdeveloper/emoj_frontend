/**
 * Editor steps (tabs): which step owns each form field, which error to
 * show first, and each step's status for its tab (error, done or todo).
 */
import type { ChecklistItem } from "./project-form";

export interface EditorTab {
  id: string;
  label: string;
  /** Form fields shown in this step, in screen order. */
  fields: readonly string[];
}

export type TabState = "error" | "done" | "todo";

export function tabForField(tabs: readonly EditorTab[], field: string): string {
  return tabs.find((t) => t.fields.includes(field))?.id ?? tabs[0]?.id ?? "";
}

export function firstErrorField(
  tabs: readonly EditorTab[],
  fields: readonly string[],
): string | null {
  for (const tab of tabs) {
    for (const field of tab.fields) {
      if (fields.includes(field)) return field;
    }
  }
  return fields[0] ?? null;
}

/**
 * "error" when a field of the step has an error; "done" when every
 * checklist item of the step is done (a step without items never is);
 * otherwise "todo".
 */
export function tabStatus(
  tabs: readonly EditorTab[],
  checklist: readonly ChecklistItem<string>[],
  errorFields: readonly string[],
): Record<string, TabState> {
  return Object.fromEntries(
    tabs.map((tab) => {
      if (errorFields.some((f) => tab.fields.includes(f))) {
        return [tab.id, "error"];
      }
      const items = checklist.filter((i) => tab.fields.includes(i.field));
      const done = items.length > 0 && items.every((i) => i.done);
      return [tab.id, done ? "done" : "todo"];
    }),
  );
}
