/**
 * Sitemap of the pages rendered on demand (src/pages/sitemap-content.xml.ts).
 * @astrojs/sitemap only lists pages built ahead of time, so the home, the
 * listings and every project and article are listed here, and the sitemap
 * index points at this file (customSitemaps in astro.config.mjs).
 */
interface Item {
  slug: string;
  publishedAt: string;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function contentSitemap(
  site: URL,
  content: {
    projects: readonly Item[];
    news: readonly Item[];
    perPage: number;
  },
): string {
  const entries: { path: string; lastmod?: string }[] = [
    { path: "/" },
    { path: "/proyectos" },
    { path: "/noticias" },
  ];
  const pages = Math.ceil(content.news.length / content.perPage);
  for (let page = 2; page <= pages; page++) {
    entries.push({ path: `/noticias/pagina/${page}` });
  }
  for (const p of content.projects) {
    entries.push({ path: `/proyectos/${p.slug}`, lastmod: p.publishedAt });
  }
  for (const n of content.news) {
    entries.push({ path: `/noticias/${n.slug}`, lastmod: n.publishedAt });
  }
  const urls = entries.map(({ path, lastmod }) => {
    const loc = `<loc>${escapeXml(new URL(path, site).href)}</loc>`;
    const mod = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
    return `<url>${loc}${mod}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
