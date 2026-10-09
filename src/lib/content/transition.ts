/**
 * View-transition names for project photos. The project card and the cover
 * on the project page share the same name, so the photo morphs between them
 * on navigation (motion.css `.vt-project`, read with `attr(data-vt)`).
 *
 * The result must be a valid CSS <custom-ident>: API slugs are already
 * lowercase ASCII with hyphens, but anything else is replaced defensively,
 * and the prefix keeps the name from starting with a digit.
 */
export function projectTransitionName(slug: string): string {
  return `project-${slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
}

/**
 * The project slug of a `/proyectos/<slug>` URL, or null for any other page.
 * Used on navigation (src/scripts/project-transition.ts) to name only the
 * photo of the project being opened.
 */
export function projectSlugFromUrl(url: string): string | null {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  const match = /^\/proyectos\/([^/]+)\/?$/.exec(path);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
