/**
 * The Portada section of the panel (the home page hero): form values, the
 * same rules the API applies (so most mistakes show before saving), the
 * API's field errors on the form, and the focal point picked on each photo.
 */
import type { FieldError } from "../api/client";
import { FOCUS_STEP } from "../content/home-hero";
import type { AdminHomeHero, HomeHeroInput } from "./api";
import { fieldErrors, tooLong } from "./form-errors";
import { charCount } from "./project-form";

/** Mirrors the API (internal/domain/home.go). */
export const HERO_LIMITS = {
  title: 120,
  highlight: 40,
  lead: 300,
  label: 40,
  href: 300,
  photos: 8,
} as const;

export interface HeroPhotoValue {
  mediaId: string;
  focusX: number;
  focusY: number;
}

export interface HeroForm {
  title: string;
  highlight: string;
  lead: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  photos: HeroPhotoValue[];
}

export type HeroField = Exclude<keyof HeroForm, "photos"> | "photos";
export type HeroErrors = Partial<Record<HeroField, string>>;

export function formFromHero(hero: AdminHomeHero): HeroForm {
  return {
    title: hero.title,
    highlight: hero.highlight,
    lead: hero.lead,
    primaryLabel: hero.primaryCta.label,
    primaryHref: hero.primaryCta.href,
    secondaryLabel: hero.secondaryCta.label,
    secondaryHref: hero.secondaryCta.href,
    photos: hero.photos.map(({ mediaId, focusX, focusY }) => ({
      mediaId,
      focusX,
      focusY,
    })),
  };
}

export function heroInput(form: HeroForm): HomeHeroInput {
  return {
    title: form.title.trim(),
    highlight: form.highlight.trim(),
    lead: form.lead.trim(),
    primaryCta: {
      label: form.primaryLabel.trim(),
      href: form.primaryHref.trim(),
    },
    secondaryCta: {
      label: form.secondaryLabel.trim(),
      href: form.secondaryHref.trim(),
    },
    photos: form.photos.map(({ mediaId, focusX, focusY }) => ({
      mediaId,
      focusX,
      focusY,
    })),
  };
}

/** Whether two forms would save the same hero. */
export function sameForm(a: HeroForm, b: HeroForm): boolean {
  return JSON.stringify(heroInput(a)) === JSON.stringify(heroInput(b));
}

const HREF_MESSAGE =
  "Usa una dirección del sitio que empiece con / (por ejemplo /contacto), un enlace https://, mailto: o tel:.";
const HIGHLIGHT_MESSAGE =
  "Escríbela tal como aparece en el título (con las mismas mayúsculas y tildes), o déjala vacía.";
const HALF_BUTTON =
  "Completa el texto y el enlace, o deja ambos vacíos para ocultar el botón.";
const UNKNOWN_PHOTO =
  "Alguna foto ya no está en la biblioteca: quítala y vuelve a guardar.";
const REQUIRED = "Este campo es obligatorio.";

/** Null when `href` is a link the API accepts. */
export function hrefError(href: string): string | null {
  const value = href.trim();
  if (/\s|\\/.test(value)) return HREF_MESSAGE;
  if (value.startsWith("/")) {
    return value.startsWith("//") ? HREF_MESSAGE : null;
  }
  if (/^https:\/\/[^/?#]+/.test(value)) return null;
  if (/^(mailto|tel):.+/.test(value)) return null;
  return HREF_MESSAGE;
}

function text(
  errors: HeroErrors,
  field: HeroField,
  value: string,
  max: number,
  required: boolean,
) {
  if (required && value.trim() === "") errors[field] = REQUIRED;
  else if (charCount(value) > max) errors[field] = tooLong(max);
}

function link(errors: HeroErrors, field: HeroField, value: string) {
  if (errors[field]) return;
  if (charCount(value) > HERO_LIMITS.href) {
    errors[field] = tooLong(HERO_LIMITS.href);
    return;
  }
  const problem = hrefError(value);
  if (problem) errors[field] = problem;
}

/** The API's rules, in Spanish, keyed by form field. */
export function validateHero(form: HeroForm): HeroErrors {
  const errors: HeroErrors = {};
  text(errors, "title", form.title, HERO_LIMITS.title, true);
  text(errors, "highlight", form.highlight, HERO_LIMITS.highlight, false);
  const highlight = form.highlight.trim();
  if (!errors.highlight && highlight && !form.title.includes(highlight)) {
    errors.highlight = HIGHLIGHT_MESSAGE;
  }
  text(errors, "lead", form.lead, HERO_LIMITS.lead, true);

  text(errors, "primaryLabel", form.primaryLabel, HERO_LIMITS.label, true);
  text(errors, "primaryHref", form.primaryHref, HERO_LIMITS.href, true);
  link(errors, "primaryHref", form.primaryHref);

  const label = form.secondaryLabel.trim();
  const href = form.secondaryHref.trim();
  if (label || href) {
    if (!label) errors.secondaryLabel = HALF_BUTTON;
    else text(errors, "secondaryLabel", label, HERO_LIMITS.label, true);
    if (!href) errors.secondaryHref = HALF_BUTTON;
    else link(errors, "secondaryHref", href);
  }

  if (form.photos.length > HERO_LIMITS.photos) {
    errors.photos = `Puedes elegir hasta ${HERO_LIMITS.photos} fotos.`;
  }
  return errors;
}

const API_FIELDS: Record<string, HeroField> = {
  title: "title",
  highlight: "highlight",
  lead: "lead",
  "primaryCta.label": "primaryLabel",
  "primaryCta.href": "primaryHref",
  "secondaryCta.label": "secondaryLabel",
  "secondaryCta.href": "secondaryHref",
  photos: "photos",
  "photos.focus": "photos",
};

/** The API's field errors (422), in Spanish, keyed by form field. */
export function errorsFromProblem(errors: readonly FieldError[]): HeroErrors {
  return fieldErrors(422, errors, {
    fields: API_FIELDS,
    slugTaken: "",
    fallbacks: {
      highlight: HIGHLIGHT_MESSAGE,
      primaryHref: HREF_MESSAGE,
      secondaryHref: HREF_MESSAGE,
      photos: UNKNOWN_PHOTO,
    },
  }).fields;
}

/**
 * Appends library images not already in the hero, centered, up to the
 * limit; `skipped` counts the ones that did not fit.
 */
export function addPhotos(
  photos: readonly HeroPhotoValue[],
  ids: readonly string[],
): { photos: HeroPhotoValue[]; skipped: number } {
  const next = [...photos];
  let skipped = 0;
  for (const mediaId of ids) {
    if (next.some((p) => p.mediaId === mediaId)) continue;
    if (next.length >= HERO_LIMITS.photos) {
      skipped++;
      continue;
    }
    next.push({ mediaId, focusX: 50, focusY: 50 });
  }
  return { photos: next, skipped };
}

export interface FocusPoint {
  x: number;
  y: number;
}

function snap(value: number): number {
  const clamped = Math.min(100, Math.max(0, value));
  return Math.round(clamped / FOCUS_STEP) * FOCUS_STEP;
}

/** The focal point under a click or tap on the photo, in 5% steps. */
export function focusFromPoint(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): FocusPoint {
  return {
    x: snap(((clientX - rect.left) / rect.width) * 100),
    y: snap(((clientY - rect.top) / rect.height) * 100),
  };
}

/** Arrow keys move the focal point (Shift for bigger steps); null otherwise. */
export function moveFocus(
  at: FocusPoint,
  key: string,
  big: boolean,
): FocusPoint | null {
  const step = big ? FOCUS_STEP * 4 : FOCUS_STEP;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const move = moves[key];
  if (!move) return null;
  return { x: snap(at.x + move[0]), y: snap(at.y + move[1]) };
}
