import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { SERVICE_ICONS, SERVICE_SLUGS } from "./lib/services";

/**
 * Engineering services. One Markdown file per service, named `<slug>.md`;
 * the slug must be one of the API's `ServiceSlug` values.
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

export const collections = { servicios };
