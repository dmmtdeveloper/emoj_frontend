import { describe, expect, it } from "vitest";
import {
  firstErrorField,
  tabForField,
  tabStatus,
  type EditorTab,
} from "../src/lib/admin/editor-tabs";

const TABS: EditorTab[] = [
  { id: "datos", label: "Datos", fields: ["title", "client", "services"] },
  { id: "fotos", label: "Fotos", fields: ["coverMediaId", "gallery"] },
  { id: "contenido", label: "Contenido", fields: ["summary"] },
  {
    id: "google",
    label: "Google",
    fields: ["seoTitle", "seoDescription", "slug"],
  },
];

describe("tabForField", () => {
  it("finds the tab of a field, or the first tab when unknown", () => {
    expect(tabForField(TABS, "gallery")).toBe("fotos");
    expect(tabForField(TABS, "slug")).toBe("google");
    expect(tabForField(TABS, "nope")).toBe("datos");
  });
});

describe("firstErrorField", () => {
  it("picks the error that comes first in tab and field order", () => {
    expect(
      firstErrorField(TABS, ["seoDescription", "summary", "services"]),
    ).toBe("services");
    expect(firstErrorField(TABS, ["slug", "seoTitle"])).toBe("seoTitle");
    expect(firstErrorField(TABS, [])).toBeNull();
  });
});

describe("tabStatus", () => {
  const checklist = [
    { field: "title", label: "", done: true, required: true },
    { field: "services", label: "", done: true, required: true },
    { field: "coverMediaId", label: "", done: false, required: false },
    { field: "summary", label: "", done: false, required: true },
  ];

  it("marks errors first, then complete steps, and leaves the rest open", () => {
    expect(tabStatus(TABS, checklist, ["seoTitle"])).toEqual({
      datos: "done",
      fotos: "todo",
      contenido: "todo",
      google: "error",
    });
  });

  it("does not mark a step without checklist items as done", () => {
    expect(tabStatus(TABS, checklist, []).google).toBe("todo");
  });
});
