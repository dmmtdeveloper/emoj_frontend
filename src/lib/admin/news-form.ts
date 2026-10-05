/**
 * News editor rules: form values, mapping to the API's `NewsInput`, the
 * validation schema (same limits as the API domain) and what publishing
 * needs. The body is the TipTap document; an editor with no text sends
 * `null`, so an empty paragraph never counts as content.
 */
import { z } from "zod";
import type { FieldError, TipTapDocument } from "../api/client";
import type { AdminNews, NewsInput } from "./api";
import { fieldErrors, tooLong } from "./form-errors";
import { charCount, type ChecklistItem } from "./project-form";

/** Character limits, mirroring emoj_backend `internal/domain/news.go`. */
export const NEWS_LIMITS = {
  title: 200,
  excerpt: 300,
  category: 60,
  slug: 80,
  seoTitle: 60,
  seoDescription: 160,
} as const;

export interface NewsFormValues {
  title: string;
  /** Empty on a new article: the API generates it from the title. */
  slug: string;
  excerpt: string;
  category: string;
  body: TipTapDocument | null;
  coverMediaId: string | null;
  seoTitle: string;
  seoDescription: string;
  ogImageMediaId: string | null;
}

export type NewsField = keyof NewsFormValues;

export function emptyNewsForm(): NewsFormValues {
  return {
    title: "",
    slug: "",
    excerpt: "",
    category: "",
    body: null,
    coverMediaId: null,
    seoTitle: "",
    seoDescription: "",
    ogImageMediaId: null,
  };
}

type Json = Record<string, unknown>;

/** Whether the document has any text (or a horizontal rule or image). */
export function hasBodyContent(doc: unknown): boolean {
  if (typeof doc !== "object" || doc === null) return false;
  const node = doc as Json;
  if (node["type"] === "text") {
    return typeof node["text"] === "string" && node["text"].trim() !== "";
  }
  if (node["type"] === "horizontalRule" || node["type"] === "image") {
    return true;
  }
  const content = node["content"];
  return Array.isArray(content) && content.some(hasBodyContent);
}

export function newsToForm(news: AdminNews): NewsFormValues {
  return {
    title: news.title,
    slug: news.slug,
    excerpt: news.excerpt,
    category: news.category,
    body: news.body,
    coverMediaId: news.coverMediaId,
    seoTitle: news.seo.title ?? "",
    seoDescription: news.seo.description ?? "",
    ogImageMediaId: news.seo.ogImageMediaId ?? null,
  };
}

/** The full content to save (every field, so merges never matter). */
export function formToNewsInput(
  values: NewsFormValues,
  { isNew }: { isNew: boolean },
): NewsInput {
  const slug = values.slug.trim();
  return {
    ...(isNew && slug === "" ? {} : { slug }),
    title: values.title.trim(),
    excerpt: values.excerpt.trim(),
    category: values.category.trim(),
    body: hasBodyContent(values.body) ? values.body : null,
    coverMediaId: values.coverMediaId,
    seo: {
      title: values.seoTitle.trim(),
      description: values.seoDescription.trim(),
      ogImageMediaId: values.ogImageMediaId,
    },
  };
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(max: number) {
  return z.string().refine((v) => charCount(v) <= max, tooLong(max));
}

/** Rules every saved article (draft or published) must meet. */
export function newsFormSchema() {
  return z.object({
    title: text(NEWS_LIMITS.title).refine(
      (v) => v.trim() !== "",
      "Escribe el título de la noticia.",
    ),
    slug: z
      .string()
      .refine(
        (v) =>
          v.trim() === "" ||
          (v.trim().length <= NEWS_LIMITS.slug && SLUG_PATTERN.test(v.trim())),
        "Usa solo minúsculas sin tildes, números y guiones simples (por ejemplo, visita-tecnica).",
      ),
    excerpt: text(NEWS_LIMITS.excerpt),
    category: text(NEWS_LIMITS.category),
    body: z.custom<TipTapDocument | null>(),
    coverMediaId: z.string().nullable(),
    seoTitle: text(NEWS_LIMITS.seoTitle),
    seoDescription: text(NEWS_LIMITS.seoDescription),
    ogImageMediaId: z.string().nullable(),
  }) satisfies z.ZodType<NewsFormValues>;
}

export function newsPublishChecklist(
  values: NewsFormValues,
): ChecklistItem<NewsField>[] {
  const filled = (v: string) => v.trim() !== "";
  return [
    {
      field: "title",
      label: "Título",
      done: filled(values.title),
      required: true,
    },
    {
      field: "excerpt",
      label: "Bajada",
      done: filled(values.excerpt),
      required: true,
    },
    {
      field: "body",
      label: "Texto de la noticia",
      done: hasBodyContent(values.body),
      required: true,
    },
    {
      field: "seoDescription",
      label: "Descripción para Google",
      done: filled(values.seoDescription),
      required: true,
    },
    {
      field: "coverMediaId",
      label: "Foto de portada",
      done: values.coverMediaId !== null,
      required: false,
    },
    {
      field: "category",
      label: "Categoría",
      done: filled(values.category),
      required: false,
    },
  ];
}

const API_FIELDS: Record<string, NewsField> = {
  title: "title",
  slug: "slug",
  excerpt: "excerpt",
  category: "category",
  body: "body",
  coverMediaId: "coverMediaId",
  "seo.title": "seoTitle",
  "seo.description": "seoDescription",
  "seo.ogImageMediaId": "ogImageMediaId",
};

export function newsFormErrorsFromProblem(
  status: number,
  errors: readonly FieldError[] = [],
) {
  return fieldErrors(status, errors, {
    fields: API_FIELDS,
    slugTaken:
      "Ya hay otra noticia con esta dirección. Cámbiala para continuar.",
    fallbacks: {
      body: "El texto tiene un formato que no se puede guardar. Revisa los enlaces o pega el texto sin formato.",
    },
  });
}
