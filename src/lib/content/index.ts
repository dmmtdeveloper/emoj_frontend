/**
 * Projects and news from the content collections (src/content/proyectos,
 * src/content/noticias), read at build time. Editing a file there and
 * pushing it to git is how content is published: the site is rebuilt and
 * every page is static.
 */
import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import { assertNamedBySlug, contentImage, newestFirst } from "./collections";
import type { NewsDetail, ProjectDetail } from "./types";

function images(
  list: readonly CollectionEntry<"proyectos">["data"]["gallery"][number][],
) {
  return list.flatMap((image) => contentImage(image) ?? []);
}

function toProject({ data }: CollectionEntry<"proyectos">): ProjectDetail {
  return {
    ...data,
    cover: contentImage(data.cover),
    gallery: images(data.gallery),
    seo: { ...data.seo, ogImage: contentImage(data.seo.ogImage) },
  };
}

function toArticle({ data, body }: CollectionEntry<"noticias">): NewsDetail {
  return {
    ...data,
    cover: contentImage(data.cover),
    gallery: images(data.gallery),
    seo: { ...data.seo, ogImage: contentImage(data.seo.ogImage) },
    body: body ?? "",
  };
}

/** Every project, newest first. */
export async function getProjects(): Promise<ProjectDetail[]> {
  const entries = await getCollection("proyectos");
  assertNamedBySlug("proyectos", entries);
  return newestFirst(entries.map(toProject));
}

/** Every article, newest first. */
export async function getNews(): Promise<NewsDetail[]> {
  const entries = await getCollection("noticias");
  assertNamedBySlug("noticias", entries);
  return newestFirst(entries.map(toArticle));
}

/** The article's collection entry, to render its Markdown body. */
export async function getArticleEntry(
  slug: string,
): Promise<CollectionEntry<"noticias">> {
  const entry = await getEntry("noticias", slug);
  if (!entry) throw new Error(`No article "${slug}" in src/content/noticias.`);
  return entry;
}
