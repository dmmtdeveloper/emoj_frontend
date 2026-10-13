/**
 * View-transition names for project and news photos. A card and the cover
 * of its page share the same name, so the photo morphs between them on
 * navigation (motion.css `.vt-project`, read with `attr(data-vt)`).
 *
 * The result must be a valid CSS <custom-ident>: API slugs are already
 * lowercase ASCII with hyphens, but anything else is replaced defensively,
 * and the prefix keeps the name from starting with a digit.
 */
function ident(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

export function projectTransitionName(slug: string): string {
  return `project-${ident(slug)}`;
}

/**
 * The whole project card while the filter on /proyectos reflows the grid
 * (motion.css `.vt-filtering [data-project]`), apart from its photo.
 */
export function projectItemName(slug: string): string {
  return `project-item-${ident(slug)}`;
}

export function newsTransitionName(slug: string): string {
  return `news-${ident(slug)}`;
}

/**
 * The project slug of a `/proyectos/<slug>` URL, or null for any other page.
 * Used on navigation (src/scripts/project-transition.ts) to name only the
 * photo of the project being opened.
 */
export function projectSlugFromUrl(url: string): string | null {
  return slugFromUrl(url, "proyectos");
}

/**
 * The photo name for the page a URL opens: a project (`/proyectos/<slug>`)
 * or an article (`/noticias/<slug>`); null for any other page, including
 * the lists and `/noticias/pagina/<n>`.
 */
export function transitionNameFromUrl(url: string): string | null {
  const project = slugFromUrl(url, "proyectos");
  if (project) return projectTransitionName(project);
  const article = slugFromUrl(url, "noticias");
  return article ? newsTransitionName(article) : null;
}

function slugFromUrl(url: string, section: string): string | null {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  const match = new RegExp(`^/${section}/([^/]+)/?$`).exec(path);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
