/**
 * Project editor rules: the form values, their mapping to the API's
 * `ProjectInput`, the validation schema (same limits as the API domain, so
 * most mistakes are caught before saving) and the publishing checklist.
 *
 * The API stays the source of truth: anything it still rejects comes back
 * as field errors and is shown next to the field (`formErrorsFromProblem`).
 */
import { z } from "zod";
import type { FieldError, ServiceSlug } from "../api/client";
import { SERVICE_SLUGS } from "../services";
import type { AdminProject, ProjectInput } from "./api";

/** Character limits, mirroring emoj_backend `internal/domain`. */
export const PROJECT_LIMITS = {
  title: 200,
  client: 200,
  location: 200,
  region: 100,
  summary: 500,
  longText: 10000,
  slug: 80,
  seoTitle: 60,
  seoDescription: 160,
} as const;

export const MIN_PROJECT_YEAR = 1990;

/** Chile's regions, in the "Región de …" form used by the content. */
export const CHILE_REGIONS = [
  "Región de Arica y Parinacota",
  "Región de Tarapacá",
  "Región de Antofagasta",
  "Región de Atacama",
  "Región de Coquimbo",
  "Región de Valparaíso",
  "Región Metropolitana de Santiago",
  "Región del Libertador General Bernardo O'Higgins",
  "Región del Maule",
  "Región de Ñuble",
  "Región del Biobío",
  "Región de La Araucanía",
  "Región de Los Ríos",
  "Región de Los Lagos",
  "Región de Aysén del General Carlos Ibáñez del Campo",
  "Región de Magallanes y de la Antártica Chilena",
] as const;

export interface ProjectFormValues {
  title: string;
  /** Empty on a new project: the API generates it from the title. */
  slug: string;
  client: string;
  location: string;
  region: string;
  /** Free text in the form; empty means unknown. */
  year: string;
  services: ServiceSlug[];
  summary: string;
  challenge: string;
  solution: string;
  result: string;
  coverMediaId: string | null;
  gallery: string[];
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  ogImageMediaId: string | null;
}

export type ProjectField = keyof ProjectFormValues;

export function emptyProjectForm(): ProjectFormValues {
  return {
    title: "",
    slug: "",
    client: "",
    location: "",
    region: "",
    year: "",
    services: [],
    summary: "",
    challenge: "",
    solution: "",
    result: "",
    coverMediaId: null,
    gallery: [],
    featured: false,
    seoTitle: "",
    seoDescription: "",
    ogImageMediaId: null,
  };
}

export function projectToForm(project: AdminProject): ProjectFormValues {
  return {
    title: project.title,
    slug: project.slug,
    client: project.client,
    location: project.location,
    region: project.region,
    year: project.year ? String(project.year) : "",
    services: [...project.services],
    summary: project.summary,
    challenge: project.challenge,
    solution: project.solution,
    result: project.result,
    coverMediaId: project.coverMediaId,
    gallery: [...project.gallery],
    featured: project.featured,
    seoTitle: project.seo.title ?? "",
    seoDescription: project.seo.description ?? "",
    ogImageMediaId: project.seo.ogImageMediaId ?? null,
  };
}

/**
 * The full content to save. Every field is sent, so the result does not
 * depend on how the API merges partial updates.
 */
export function formToProjectInput(
  values: ProjectFormValues,
  { isNew }: { isNew: boolean },
): ProjectInput {
  const slug = values.slug.trim();
  const year = values.year.trim();
  return {
    ...(isNew && slug === "" ? {} : { slug }),
    title: values.title.trim(),
    client: values.client.trim(),
    location: values.location.trim(),
    region: values.region.trim(),
    year: year === "" ? 0 : Number(year),
    services: [...values.services],
    summary: values.summary.trim(),
    challenge: values.challenge.trim(),
    solution: values.solution.trim(),
    result: values.result.trim(),
    coverMediaId: values.coverMediaId,
    gallery: [...values.gallery],
    featured: values.featured,
    seo: {
      title: values.seoTitle.trim(),
      description: values.seoDescription.trim(),
      ogImageMediaId: values.ogImageMediaId,
    },
  };
}

/** Length in Unicode code points, like the Go API counts runes. */
export function charCount(value: string): number {
  return [...value].length;
}

export const tooLong = (max: number) =>
  `Puede tener hasta ${max.toLocaleString("es-CL")} caracteres.`;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(max: number) {
  return z.string().refine((v) => charCount(v) <= max, tooLong(max));
}

/** Rules every saved project (draft or published) must meet. */
export function projectFormSchema(now: Date) {
  const maxYear = now.getFullYear() + 1;
  return z.object({
    title: text(PROJECT_LIMITS.title).refine(
      (v) => v.trim() !== "",
      "Escribe el nombre del proyecto.",
    ),
    slug: z
      .string()
      .refine(
        (v) =>
          v.trim() === "" ||
          (v.trim().length <= PROJECT_LIMITS.slug &&
            SLUG_PATTERN.test(v.trim())),
        "Usa solo minúsculas sin tildes, números y guiones simples (por ejemplo, canal-la-petaca).",
      ),
    client: text(PROJECT_LIMITS.client),
    location: text(PROJECT_LIMITS.location),
    region: text(PROJECT_LIMITS.region),
    year: z.string().refine((v) => {
      const year = v.trim();
      if (year === "") return true;
      if (!/^\d{4}$/.test(year)) return false;
      const n = Number(year);
      return n >= MIN_PROJECT_YEAR && n <= maxYear;
    }, `Escribe un año entre ${MIN_PROJECT_YEAR} y ${maxYear}, o déjalo vacío si no lo sabes.`),
    services: z
      .array(z.enum(SERVICE_SLUGS))
      .min(1, "Elige al menos un servicio."),
    summary: text(PROJECT_LIMITS.summary),
    challenge: text(PROJECT_LIMITS.longText),
    solution: text(PROJECT_LIMITS.longText),
    result: text(PROJECT_LIMITS.longText),
    coverMediaId: z.string().nullable(),
    gallery: z
      .array(z.string())
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "La misma imagen está dos veces en la galería.",
      ),
    featured: z.boolean(),
    seoTitle: text(PROJECT_LIMITS.seoTitle),
    seoDescription: text(PROJECT_LIMITS.seoDescription),
    ogImageMediaId: z.string().nullable(),
  }) satisfies z.ZodType<ProjectFormValues>;
}

export interface ChecklistItem {
  field: ProjectField;
  label: string;
  done: boolean;
  /** Required by the API to publish; otherwise only recommended. */
  required: boolean;
}

/** What publishing needs (required) and what makes a better page. */
export function publishChecklist(values: ProjectFormValues): ChecklistItem[] {
  const filled = (v: string) => v.trim() !== "";
  return [
    {
      field: "title",
      label: "Nombre del proyecto",
      done: filled(values.title),
      required: true,
    },
    {
      field: "services",
      label: "Al menos un servicio",
      done: values.services.length > 0,
      required: true,
    },
    {
      field: "summary",
      label: "Resumen",
      done: filled(values.summary),
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
      field: "gallery",
      label: "Fotos en la galería",
      done: values.gallery.length > 0,
      required: false,
    },
    {
      field: "client",
      label: "Mandante",
      done: filled(values.client),
      required: false,
    },
    {
      field: "location",
      label: "Ubicación",
      done: filled(values.location),
      required: false,
    },
  ];
}

const API_FIELDS: Record<string, ProjectField> = {
  title: "title",
  slug: "slug",
  client: "client",
  location: "location",
  region: "region",
  year: "year",
  services: "services",
  summary: "summary",
  challenge: "challenge",
  solution: "solution",
  result: "result",
  coverMediaId: "coverMediaId",
  gallery: "gallery",
  featured: "featured",
  "seo.title": "seoTitle",
  "seo.description": "seoDescription",
  "seo.ogImageMediaId": "ogImageMediaId",
};

/** Spanish wording for the API's English field messages. */
function translate(status: number, field: ProjectField, message: string) {
  if (status === 409 && field === "slug") {
    return "Ya hay otro proyecto con esta dirección. Cámbiala para continuar.";
  }
  const max = /at most (\d+)/.exec(message);
  if (max) return tooLong(Number(max[1]));
  if (/required to publish/.test(message)) {
    return "Es obligatorio para publicar.";
  }
  if (/required/.test(message)) return "Este campo es obligatorio.";
  if (field === "services") return "Elige al menos un servicio.";
  if (field === "year") return "Escribe un año válido o déjalo vacío.";
  if (field === "slug") {
    return "Usa solo minúsculas sin tildes, números y guiones simples.";
  }
  return "Revisa este campo.";
}

/**
 * Field errors from an API problem (409/422), keyed by form field. Fields
 * the form does not show are listed in `other`.
 */
export function formErrorsFromProblem(
  status: number,
  errors: readonly FieldError[] = [],
): { fields: Partial<Record<ProjectField, string>>; other: string[] } {
  const fields: Partial<Record<ProjectField, string>> = {};
  const other: string[] = [];
  for (const { field, message } of errors) {
    const name = API_FIELDS[field];
    if (!name) {
      other.push(field);
      continue;
    }
    fields[name] ??= translate(status, name, message);
  }
  return { fields, other };
}
