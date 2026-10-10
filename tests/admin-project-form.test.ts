import { describe, expect, it } from "vitest";
import type { AdminProject } from "../src/lib/admin/api";
import {
  emptyProjectForm,
  formErrorsFromProblem,
  formToProjectInput,
  projectFormSchema,
  projectToForm,
  publishChecklist,
  type ProjectFormValues,
} from "../src/lib/admin/project-form";

const NOW = new Date("2026-10-05T12:00:00Z");

function project(overrides: Partial<AdminProject> = {}): AdminProject {
  return {
    id: "p1",
    slug: "canal-la-petaca",
    title: "Canal La Petaca",
    client: "DOH",
    location: "Limache",
    region: "Valparaíso",
    year: 0,
    services: ["obras-sanitarias"],
    summary: "Resumen",
    magnitude: { label: "", value: "", unit: "" },
    challenge: "",
    solution: "",
    result: "",
    coverMediaId: null,
    gallery: ["m1", "m2"],
    featured: false,
    status: "draft",
    publishedAt: null,
    seo: {},
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function form(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return { ...emptyProjectForm(), ...overrides };
}

describe("projectToForm / formToProjectInput", () => {
  it("round-trips a project, with an unknown year as an empty field", () => {
    const values = projectToForm(
      project({ seo: { title: "T", ogImageMediaId: "m3" } }),
    );
    expect(values.year).toBe("");
    expect(values.seoTitle).toBe("T");
    expect(values.seoDescription).toBe("");
    expect(values.ogImageMediaId).toBe("m3");
    const input = formToProjectInput(values, { isNew: false });
    expect(input).toMatchObject({
      slug: "canal-la-petaca",
      year: 0,
      gallery: ["m1", "m2"],
      coverMediaId: null,
      seo: { title: "T", description: "", ogImageMediaId: "m3" },
    });
  });

  it("trims text and turns the year into a number", () => {
    const input = formToProjectInput(
      form({ title: "  Puente  ", year: " 2019 ", services: ["geotecnia"] }),
      { isNew: false },
    );
    expect(input.title).toBe("Puente");
    expect(input.year).toBe(2019);
  });

  it("round-trips the magnitude, trimmed", () => {
    const values = projectToForm(
      project({ magnitude: { label: "Caudal", value: "1.200", unit: "l/s" } }),
    );
    expect(values).toMatchObject({
      magnitudeLabel: "Caudal",
      magnitudeValue: "1.200",
      magnitudeUnit: "l/s",
    });
    const input = formToProjectInput(
      { ...values, magnitudeLabel: " Caudal ", magnitudeUnit: " l/s " },
      { isNew: false },
    );
    expect(input.magnitude).toEqual({
      label: "Caudal",
      value: "1.200",
      unit: "l/s",
    });
  });

  it("sends an empty magnitude to clear it", () => {
    const input = formToProjectInput(form({ title: "Puente" }), {
      isNew: false,
    });
    expect(input.magnitude).toEqual({ label: "", value: "", unit: "" });
  });

  it("leaves the slug out of a new project when it is empty", () => {
    const input = formToProjectInput(form({ title: "Puente" }), {
      isNew: true,
    });
    expect(input).not.toHaveProperty("slug");
  });
});

describe("projectFormSchema", () => {
  const schema = projectFormSchema(NOW);
  const valid = form({ title: "Puente", services: ["geotecnia"] });

  function errors(values: ProjectFormValues): Record<string, string> {
    const result = schema.safeParse(values);
    if (result.success) return {};
    return Object.fromEntries(
      result.error.issues.map((i) => [i.path.join("."), i.message]),
    );
  }

  it("accepts a minimal draft: a title and one service", () => {
    expect(errors(valid)).toEqual({});
  });

  it("asks for the title and at least one service", () => {
    expect(errors(form())).toEqual({
      title: "Escribe el nombre del proyecto.",
      services: "Elige al menos un servicio.",
    });
  });

  it("checks the year range, allowing an empty year", () => {
    expect(errors({ ...valid, year: "1989" })).toHaveProperty("year");
    expect(errors({ ...valid, year: "2028" })).toHaveProperty("year");
    expect(errors({ ...valid, year: "20x9" })).toHaveProperty("year");
    expect(errors({ ...valid, year: "2027" })).toEqual({});
    expect(errors({ ...valid, year: "" })).toEqual({});
  });

  it("checks the slug shape when one is given", () => {
    expect(errors({ ...valid, slug: "Canal La Petaca" })).toHaveProperty(
      "slug",
    );
    expect(errors({ ...valid, slug: "canal--petaca" })).toHaveProperty("slug");
    expect(errors({ ...valid, slug: "canal-la-petaca-2" })).toEqual({});
  });

  it("enforces the API length limits, counting characters", () => {
    expect(errors({ ...valid, summary: "á".repeat(500) })).toEqual({});
    expect(errors({ ...valid, summary: "á".repeat(501) })).toEqual({
      summary: "Puede tener hasta 500 caracteres.",
    });
    expect(errors({ ...valid, seoTitle: "x".repeat(61) })).toHaveProperty(
      "seoTitle",
    );
    expect(
      errors({ ...valid, seoDescription: "x".repeat(161) }),
    ).toHaveProperty("seoDescription");
  });

  it("checks the magnitude like the API", () => {
    const errorsOf = (values: Partial<ProjectFormValues>) => {
      const r = projectFormSchema(NOW).safeParse(
        form({ title: "P", services: ["geotecnia"], ...values }),
      );
      return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    };
    expect(errorsOf({ magnitudeValue: "1.200", magnitudeUnit: "l/s" })).toEqual(
      [],
    );
    expect(errorsOf({ magnitudeUnit: "l/s" })).toEqual(["magnitudeValue"]);
    expect(errorsOf({ magnitudeValue: "mucho" })).toEqual(["magnitudeValue"]);
    expect(
      errorsOf({ magnitudeValue: "1", magnitudeLabel: "x".repeat(41) }),
    ).toEqual(["magnitudeLabel"]);
    expect(errorsOf({ magnitudeValue: "1".repeat(25) })).toEqual([
      "magnitudeValue",
    ]);
    expect(
      errorsOf({ magnitudeValue: "1", magnitudeUnit: "u".repeat(17) }),
    ).toEqual(["magnitudeUnit"]);
  });

  it("rejects the same image twice in the gallery", () => {
    expect(errors({ ...valid, gallery: ["m1", "m1"] })).toHaveProperty(
      "gallery",
    );
  });
});

describe("publishChecklist", () => {
  it("lists what publishing requires and what is recommended", () => {
    const list = publishChecklist(form({ title: "Puente" }));
    const required = list.filter((i) => i.required);
    expect(required.map((i) => [i.field, i.done])).toEqual([
      ["title", true],
      ["services", false],
      ["summary", false],
      ["seoDescription", false],
    ]);
    expect(list.some((i) => !i.required && i.field === "coverMediaId")).toBe(
      true,
    );
  });

  it("is complete when the required items are filled in", () => {
    const list = publishChecklist(
      form({
        title: "Puente",
        services: ["geotecnia"],
        summary: "Resumen",
        seoDescription: "Descripción",
      }),
    );
    expect(list.filter((i) => i.required).every((i) => i.done)).toBe(true);
  });
});

describe("formErrorsFromProblem", () => {
  it("maps API field names and messages to the form, in Spanish", () => {
    const result = formErrorsFromProblem(422, [
      { field: "seo.description", message: "is required to publish" },
      { field: "summary", message: "must be at most 500 characters" },
      { field: "coverMediaId", message: "refers to a missing image" },
      { field: "status", message: "must be draft or published" },
    ]);
    expect(result.fields).toEqual({
      seoDescription: "Es obligatorio para publicar.",
      summary: "Puede tener hasta 500 caracteres.",
      coverMediaId: "Revisa este campo.",
    });
    expect(result.other).toEqual(["status"]);
  });

  it("maps magnitude errors to their fields", () => {
    const result = formErrorsFromProblem(422, [
      { field: "magnitude.value", message: "must contain a number" },
      { field: "magnitude.unit", message: "must be at most 16 characters" },
    ]);
    expect(result.fields.magnitudeValue).toBeTruthy();
    expect(result.fields.magnitudeUnit).toBe(
      "Puede tener hasta 16 caracteres.",
    );
  });

  it("explains a slug already in use", () => {
    const result = formErrorsFromProblem(409, [
      { field: "slug", message: "is already in use" },
    ]);
    expect(result.fields.slug).toMatch(/otro proyecto/);
  });
});
