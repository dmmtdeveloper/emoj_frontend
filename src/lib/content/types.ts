/**
 * Projects and news as the pages use them, read from the content
 * collections (src/content/proyectos, src/content/noticias; see ./index.ts).
 * Field names follow the former EMOJ API, so the pages kept their shape when
 * the content moved into this repository.
 */
import type { ImageMetadata } from "astro";
import type { ServiceSlug } from "../services";

/** A photo in src/assets, optimised by astro:assets. */
export interface ContentImage {
  src: ImageMetadata;
  alt: string;
  width: number;
  height: number;
}

/** A project's headline figure, e.g. "Caudal 1.200 l/s". */
export interface Magnitude {
  label?: string | undefined;
  value: string;
  unit?: string | undefined;
}

export interface Seo {
  title: string;
  description: string;
  ogImage?: ContentImage | undefined;
}

export interface ProjectSummary {
  id: string;
  slug: string;
  title: string;
  client: string;
  location: string;
  region: string;
  year?: number | undefined;
  services: ServiceSlug[];
  summary: string;
  magnitude?: Magnitude | undefined;
  featured: boolean;
  /** ISO 8601 date-time. */
  publishedAt: string;
  cover?: ContentImage | undefined;
}

export interface ProjectDetail extends ProjectSummary {
  challenge: string;
  solution: string;
  result: string;
  gallery: ContentImage[];
  seo: Seo;
}

export interface NewsSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Free short label; empty when uncategorized. */
  category: string;
  location?: string | undefined;
  /** ISO 8601 date-time. */
  publishedAt: string;
  cover?: ContentImage | undefined;
}

export interface NewsDetail extends NewsSummary {
  gallery: ContentImage[];
  seo: Seo;
  /** The Markdown body, as written in the file. */
  body: string;
}
