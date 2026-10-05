/**
 * SEO helpers for the editors: how long the SEO title and description are
 * compared with what search engines show, and a preview of the result as it
 * would appear in Google (with the same fallbacks as the public page).
 */
import { SITE_NAME } from "../site";
import { charCount } from "./project-form";

export type SeoLength = "empty" | "short" | "good" | "long";

/** Recommended ranges, in characters; above `max` the API rejects it. */
export const SEO_RANGES = {
  title: { min: 30, max: 60 },
  description: { min: 70, max: 160 },
} as const;

export function seoLength(
  value: string,
  kind: keyof typeof SEO_RANGES,
): SeoLength {
  const n = charCount(value.trim());
  const { min, max } = SEO_RANGES[kind];
  if (n === 0) return "empty";
  if (n < min) return "short";
  if (n > max) return "long";
  return "good";
}

function cut(value: string, max: number): string {
  const chars = [...value];
  if (chars.length <= max) return value;
  return `${chars.slice(0, max).join("").trimEnd()}…`;
}

export interface SearchPreviewInput {
  section: "proyectos" | "noticias";
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  /** Summary (projects) or excerpt (news): used when there is no SEO description. */
  fallbackDescription: string;
}

export interface SearchPreview {
  title: string;
  url: string;
  description: string;
}

export function searchPreview(input: SearchPreviewInput): SearchPreview {
  const base = input.seoTitle.trim() || input.title.trim() || "Sin título";
  const slug = input.slug.trim() || "…";
  return {
    title: cut(`${base} | ${SITE_NAME}`, SEO_RANGES.title.max),
    url: `emoj.cl › ${input.section} › ${slug}`,
    description: cut(
      input.seoDescription.trim() || input.fallbackDescription.trim(),
      SEO_RANGES.description.max,
    ),
  };
}
