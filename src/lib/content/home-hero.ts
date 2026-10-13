/**
 * The home hero copy, from the panel (GET /v1/home/hero) or, when the API
 * has none, the copy the site shipped with. Helpers for Hero.astro: the
 * title split around its highlighted word, numbers kept with their unit,
 * and the photo focal point as CSS classes (style="" is not allowed by the
 * CSP; the classes are defined in src/styles/global.css).
 */
import type { CallToAction, HomeHero } from "../api/client";

export interface HeroCopy {
  title: string;
  highlight: string;
  lead: string;
  primaryCta: CallToAction;
  secondaryCta: CallToAction | null;
}

export const DEFAULT_HERO_COPY: HeroCopy = {
  title: "Más de 30 años innovando en consultoría",
  highlight: "innovando",
  lead: "Diseñamos soluciones eficientes para el abastecimiento y saneamiento de agua, con la experiencia, la tecnología y la calidad que exige cada proyecto de ingeniería civil.",
  primaryCta: { label: "Cotizar proyecto", href: "/contacto" },
  secondaryCta: { label: "Ver proyectos", href: "/proyectos" },
};

export function heroCopy(hero: HomeHero | null): HeroCopy {
  if (!hero) return DEFAULT_HERO_COPY;
  return {
    title: hero.title,
    highlight: hero.highlight,
    lead: hero.lead,
    primaryCta: hero.primaryCta,
    secondaryCta: hero.secondaryCta ?? null,
  };
}

/**
 * The three photos the site shipped with (src/assets/photos), shown while
 * no photo is chosen in the panel. The panel can add them to the media
 * library; `focusX`/`focusY` are their crops on phones.
 */
export const BUILT_IN_PHOTOS = [
  {
    file: "agua-manos.jpg",
    alt: "Manos recibiendo un chorro de agua limpia.",
    focusX: 60,
    focusY: 50,
  },
  {
    file: "estacion-bombeo-tuberias.jpg",
    alt: "Estación de bombeo con tuberías blancas y bombas azules sobre una losa de hormigón.",
    focusX: 50,
    focusY: 50,
  },
  {
    file: "vista-aerea-industrial.jpg",
    alt: "Vista aérea de un complejo industrial costero con una chimenea alta.",
    focusX: 40,
    focusY: 50,
  },
] as const;

/**
 * Built-in photos already in the media library (matched by alt text), by
 * file name, so adding them twice reuses the first upload.
 */
export function builtInInLibrary(
  library: readonly { id: string; alt: string }[],
): Map<string, string> {
  const found = new Map<string, string>();
  for (const photo of BUILT_IN_PHOTOS) {
    const media = library.find((m) => m.alt === photo.alt);
    if (media) found.set(photo.file, media.id);
  }
  return found;
}

export interface TitleParts {
  before: string;
  highlight: string;
  after: string;
}

/** The title around the first match of `highlight` (whole when absent). */
export function titleParts(title: string, highlight: string): TitleParts {
  const at = highlight ? title.indexOf(highlight) : -1;
  if (at < 0) return { before: title, highlight: "", after: "" };
  return {
    before: title.slice(0, at),
    highlight,
    after: title.slice(at + highlight.length),
  };
}

/** A non-breaking space after each number, so "30 años" stays together. */
export function keepNumbersTogether(text: string): string {
  return text.replace(/(\d)[ \t]+(?=\p{L})/gu, "$1 ");
}

/** The focal point snaps to this step (in percent). */
export const FOCUS_STEP = 5;

function snap(value: number): number {
  const clamped = Math.min(100, Math.max(0, value));
  return Math.round(clamped / FOCUS_STEP) * FOCUS_STEP;
}

/** `focus-x-*` / `focus-y-*` classes for a focal point in percent. */
export function focusClasses(x: number, y: number): string {
  return `focus-x-${snap(x)} focus-y-${snap(y)}`;
}

/** Links that leave the site open in a new tab. */
export function isExternalHref(href: string): boolean {
  return href.startsWith("https://");
}
