import { describe, expect, it } from "vitest";
import type { AdminNews } from "../src/lib/admin/api";
import type { TipTapDocument } from "../src/lib/api/client";
import {
  emptyNewsForm,
  formToNewsInput,
  hasBodyContent,
  newsFormErrorsFromProblem,
  newsFormSchema,
  newsPublishChecklist,
  newsToForm,
  type NewsFormValues,
} from "../src/lib/admin/news-form";

const paragraph = (text: string) => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});
const doc = (...content: object[]) =>
  ({ type: "doc", content }) as unknown as TipTapDocument;

function article(overrides: Partial<AdminNews> = {}): AdminNews {
  return {
    id: "n1",
    slug: "visita-tecnica",
    title: "Visita técnica",
    excerpt: "Fuimos al canal.",
    body: doc(paragraph("Hola")),
    coverMediaId: "m1",
    category: "Proyectos",
    status: "draft",
    publishedAt: null,
    seo: { title: "", description: "Visita al canal" },
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function form(overrides: Partial<NewsFormValues> = {}): NewsFormValues {
  return { ...emptyNewsForm(), ...overrides };
}

describe("hasBodyContent", () => {
  it("is false for no body or only empty paragraphs", () => {
    expect(hasBodyContent(null)).toBe(false);
    expect(hasBodyContent(doc())).toBe(false);
    expect(hasBodyContent(doc(paragraph(""), paragraph("   ")))).toBe(false);
  });

  it("is true with text anywhere or a horizontal rule", () => {
    expect(
      hasBodyContent(
        doc({
          type: "bulletList",
          content: [{ type: "listItem", content: [paragraph("uno")] }],
        }),
      ),
    ).toBe(true);
    expect(hasBodyContent(doc({ type: "horizontalRule" }))).toBe(true);
  });
});

describe("newsToForm / formToNewsInput", () => {
  it("round-trips an article", () => {
    const values = newsToForm(article());
    expect(values).toMatchObject({
      title: "Visita técnica",
      category: "Proyectos",
      seoDescription: "Visita al canal",
      coverMediaId: "m1",
    });
    expect(formToNewsInput(values, { isNew: false })).toMatchObject({
      slug: "visita-tecnica",
      body: doc(paragraph("Hola")),
      seo: { title: "", description: "Visita al canal", ogImageMediaId: null },
    });
  });

  it("sends an empty body as null and leaves out an empty slug when new", () => {
    const input = formToNewsInput(
      form({ title: " Hola ", body: doc(paragraph("")) }),
      { isNew: true },
    );
    expect(input.body).toBeNull();
    expect(input.title).toBe("Hola");
    expect(input).not.toHaveProperty("slug");
  });
});

describe("newsFormSchema", () => {
  const schema = newsFormSchema();
  const errors = (values: NewsFormValues) => {
    const r = schema.safeParse(values);
    return r.success
      ? {}
      : Object.fromEntries(
          r.error.issues.map((i) => [i.path.join("."), i.message]),
        );
  };

  it("needs only a title to save a draft", () => {
    expect(errors(form({ title: "Hola" }))).toEqual({});
    expect(errors(form())).toEqual({
      title: "Escribe el título de la noticia.",
    });
  });

  it("enforces the API limits", () => {
    expect(errors(form({ title: "x", excerpt: "x".repeat(301) }))).toEqual({
      excerpt: "Puede tener hasta 300 caracteres.",
    });
    expect(
      errors(form({ title: "x", category: "x".repeat(61) })),
    ).toHaveProperty("category");
    expect(errors(form({ title: "x", slug: "Con Espacios" }))).toHaveProperty(
      "slug",
    );
  });
});

describe("newsPublishChecklist", () => {
  it("requires a title, excerpt, text and Google description", () => {
    const list = newsPublishChecklist(
      form({ title: "Hola", body: doc(paragraph("")) }),
    );
    expect(
      list.filter((i) => i.required).map((i) => [i.field, i.done]),
    ).toEqual([
      ["title", true],
      ["excerpt", false],
      ["body", false],
      ["seoDescription", false],
    ]);
  });
});

describe("newsFormErrorsFromProblem", () => {
  it("maps the API fields, including the body", () => {
    const { fields } = newsFormErrorsFromProblem(422, [
      { field: "body", message: "is required to publish" },
      { field: "seo.title", message: "must be at most 60 characters" },
    ]);
    expect(fields).toEqual({
      body: "Es obligatorio para publicar.",
      seoTitle: "Puede tener hasta 60 caracteres.",
    });
    expect(
      newsFormErrorsFromProblem(409, [{ field: "slug", message: "in use" }])
        .fields.slug,
    ).toMatch(/otra noticia/);
  });
});
