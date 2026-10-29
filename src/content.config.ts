import { defineCollection, type SchemaContext } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { SERVICE_ICONS, SERVICE_SLUGS } from "./lib/services";

/**
 * Engineering services. One Markdown file per service, named `<slug>.md`;
 * the slug must be one of `SERVICE_SLUGS` (src/lib/services.ts).
 */
const servicios = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/servicios" }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      slug: z.enum(SERVICE_SLUGS),
      summary: z.string().min(1).max(140),
      icon: z.enum(SERVICE_ICONS),
      order: z.number().int().positive(),
      /** Call to action label; defaults to "Cotiza tu proyecto de <title>". */
      cta: z.string().min(1).max(60).optional(),
      deliverables: z.array(z.string().min(1)).min(1),
      examples: z
        .array(
          z.object({ title: z.string().min(1), location: z.string().min(1) }),
        )
        .default([]),
      image: image().optional(),
      imageAlt: z.string().min(1).optional(),
      seo: z.object({
        title: z.string().min(1).max(60),
        description: z.string().min(50).max(160),
      }),
    }),
});

/** Lowercase ASCII letters and digits separated by single dashes. */
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** An ISO 8601 date-time, kept as written (e.g. "2025-12-18T13:28:52Z"). */
const publishedAt = z.iso.datetime({ offset: true });

/**
 * SEO values. They are written out in full: an empty title or description
 * is not filled in from the title or summary.
 */
const seo = (image: ImageFn) =>
  z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    ogImage: photo(image).optional(),
  });

/** A photo in src/assets, with its alternative text. */
const photo = (image: ImageFn) =>
  z.object({ src: image(), alt: z.string().min(1) });

type ImageFn = SchemaContext["image"];

/**
 * Projects. One Markdown file per project in src/content/proyectos, named
 * `<slug>.md` (the page is /proyectos/<slug>); photos live in
 * src/assets/proyectos/<slug>/. Everything is in the frontmatter; the body
 * is unused. Listed newest first by `publishedAt`.
 */
const proyectos = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/proyectos" }),
  schema: ({ image }) =>
    z.object({
      id: z.uuid(),
      slug,
      title: z.string().min(1),
      client: z.string(),
      location: z.string(),
      region: z.string(),
      /** Omitted when the project year is unknown. */
      year: z.number().int().positive().optional(),
      services: z.array(z.enum(SERVICE_SLUGS)).min(1),
      summary: z.string().min(1),
      /** Headline figure, e.g. "Caudal 1.200 l/s"; the value needs a digit. */
      magnitude: z
        .object({
          label: z.string().optional(),
          value: z.string().regex(/\d/),
          unit: z.string().optional(),
        })
        .optional(),
      /** Featured projects lead the home rail. */
      featured: z.boolean().default(false),
      publishedAt,
      cover: photo(image).optional(),
      /** Plain text; a blank line separates paragraphs. Empty hides the section. */
      challenge: z.string().default(""),
      solution: z.string().default(""),
      result: z.string().default(""),
      /** In display order. */
      gallery: z.array(photo(image)).default([]),
      seo: seo(image),
    }),
});

/**
 * News. One Markdown file per article in src/content/noticias, named
 * `<slug>.md` (the page is /noticias/<slug>); the body is the article.
 * Photos live in src/assets/noticias/<slug>/. Listed newest first by
 * `publishedAt`.
 */
const noticias = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/noticias" }),
  schema: ({ image }) =>
    z.object({
      id: z.uuid(),
      slug,
      title: z.string().min(1),
      excerpt: z.string().min(1),
      /** Free short label; empty when uncategorized. */
      category: z.string().default(""),
      /** Where the story happened, e.g. "Los Andes, Región de Valparaíso". */
      location: z.string().min(1).optional(),
      publishedAt,
      cover: photo(image).optional(),
      /** Shown after the body, in this order. */
      gallery: z.array(photo(image)).default([]),
      seo: seo(image),
    }),
});

export const collections = { servicios, proyectos, noticias };
