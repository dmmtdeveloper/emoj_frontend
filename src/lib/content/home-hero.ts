/**
 * The home hero copy and photos, plus helpers for Hero.astro: the title
 * split around its highlighted word and numbers kept with their unit.
 * Edit the copy here; the photos are in src/assets/photos.
 */

/** A button label and where it leads (a site path, https, mailto: or tel:). */
export interface CallToAction {
  label: string;
  href: string;
}

export interface HeroCopy {
  title: string;
  /** A word or phrase of the title shown in the accent color; empty for none. */
  highlight: string;
  lead: string;
  primaryCta: CallToAction;
  secondaryCta: CallToAction | null;
}

export const HERO_COPY: HeroCopy = {
  title: "Más de 30 años innovando en consultoría",
  highlight: "innovando",
  lead: "Diseñamos soluciones eficientes para el abastecimiento y saneamiento de agua, con la experiencia, la tecnología y la calidad que exige cada proyecto de ingeniería civil.",
  primaryCta: { label: "Cotizar proyecto", href: "/contacto" },
  secondaryCta: { label: "Ver proyectos", href: "/proyectos" },
};

/** The three photos the hero plays (src/assets/photos), in order. */
export const BUILT_IN_PHOTOS = [
  {
    file: "agua-manos.jpg",
    alt: "Manos recibiendo un chorro de agua limpia.",
  },
  {
    file: "estacion-bombeo-tuberias.jpg",
    alt: "Estación de bombeo con tuberías blancas y bombas azules sobre una losa de hormigón.",
  },
  {
    file: "vista-aerea-industrial.jpg",
    alt: "Vista aérea de un complejo industrial costero con una chimenea alta.",
  },
] as const;

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

/** Links that leave the site open in a new tab. */
export function isExternalHref(href: string): boolean {
  return href.startsWith("https://");
}
