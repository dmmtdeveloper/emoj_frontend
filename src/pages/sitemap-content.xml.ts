/**
 * Sitemap of the content pages, with each project's and article's date
 * (src/lib/content/sitemap.ts). Built with the site, like every page.
 */
import type { APIRoute } from "astro";
import { getNews, getProjects } from "../lib/content";
import { NEWS_PER_PAGE } from "../lib/content/format";
import { contentSitemap } from "../lib/content/sitemap";

export const GET: APIRoute = async ({ site }) => {
  const [projects, news] = await Promise.all([getProjects(), getNews()]);
  const xml = contentSitemap(site ?? new URL("https://emoj.cl"), {
    projects,
    news,
    perPage: NEWS_PER_PAGE,
  });
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
