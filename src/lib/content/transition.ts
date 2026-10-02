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
