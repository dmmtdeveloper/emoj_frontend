/** Sitemap of the pages rendered on demand (src/lib/content/sitemap.ts). */
import type { APIRoute } from "astro";
import { contentSource } from "../lib/content";
import { NEWS_PER_PAGE } from "../lib/content/format";
import { contentSitemap } from "../lib/content/sitemap";

export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const content = contentSource();
  const [projects, news] = await Promise.all([
    content.getProjects(),
    content.getNews(),
  ]);
  const xml = contentSitemap(site ?? new URL("https://emoj.cl"), {
    projects,
    news,
    perPage: NEWS_PER_PAGE,
  });
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
