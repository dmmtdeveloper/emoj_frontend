import { describe, expect, it } from "vitest";
import { checklistSummary } from "../src/lib/admin/checklist";

const item = (field: string, required: boolean, done: boolean) => ({
  field,
  label: field,
  required,
  done,
});

describe("checklistSummary", () => {
  const list = [
    item("title", true, true),
    item("summary", true, false),
    item("seo", true, false),
    item("cover", false, true),
    item("gallery", false, false),
  ];

  it("splits required and recommended items and counts what is done", () => {
    const s = checklistSummary(list, false);
    expect(s.required.map((i) => i.field)).toEqual(["title", "summary", "seo"]);
    expect(s.recommended.map((i) => i.field)).toEqual(["cover", "gallery"]);
    expect(s.requiredDone).toBe(1);
    expect(s.missing).toBe(2);
  });

  it("says what is missing before publishing", () => {
    expect(checklistSummary(list, false).message).toBe(
      "Faltan 2 datos obligatorios para publicar.",
    );
    expect(checklistSummary(list.slice(0, 2), false).message).toBe(
      "Falta 1 dato obligatorio para publicar.",
    );
  });

  it("is ready when nothing required is missing", () => {
    const done = [item("title", true, true), item("cover", false, false)];
    expect(checklistSummary(done, false).message).toBe("Listo para publicar.");
    expect(checklistSummary(done, true).message).toBe(
      "Publicado. Los cambios que guardes se ven en el sitio al momento.",
    );
  });

  it("does not ask to publish what is already published", () => {
    expect(checklistSummary(list.slice(0, 2), true).message).toBe(
      "Ya está en el sitio, pero le falta 1 dato obligatorio. Complétalo para que la ficha quede completa.",
    );
  });
});
