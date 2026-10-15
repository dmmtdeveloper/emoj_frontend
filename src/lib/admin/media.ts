/**
 * Media rules for the panel, mirroring the API (emoj_backend
 * `internal/app/media.go` and `internal/domain/media.go`): which files can be
 * uploaded, the alternative text, and when an image is too small for a cover.
 */
import { charCount } from "./project-form";

export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** `accept` attribute for file inputs. */
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ALT_MAX = 250;

/** Covers are shown full width: narrower images look blurry on large screens. */
export const MIN_COVER_WIDTH = 1600;

export function uploadError(file: {
  type: string;
  size: number;
}): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return "Usa una imagen JPG, PNG, WebP o AVIF.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "La imagen pesa más de 15 MB. Redúcela antes de subirla.";
  }
  return null;
}

export function altError(alt: string): string | null {
  if (alt.trim() === "") {
    return "Describe brevemente qué muestra la imagen.";
  }
  if (charCount(alt) > ALT_MAX) {
    return `Puede tener hasta ${ALT_MAX} caracteres.`;
  }
  return null;
}

export function smallForCover(media: { width: number; height: number }) {
  return media.width > 0 && media.width < MIN_COVER_WIDTH;
}

const decimal = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${decimal.format(bytes / (1024 * 1024))} MB`;
}

/** Reorders or removes one id of an ordered list (gallery). */
export function orderedIds(
  ids: readonly string[],
  id: string,
  action: "up" | "down" | "remove",
): string[] {
  const list = [...ids];
  const index = list.indexOf(id);
  if (index === -1) return list;
  if (action === "remove") {
    list.splice(index, 1);
    return list;
  }
  const target = action === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return list;
  [list[index], list[target]] = [list[target] as string, list[index] as string];
  return list;
}

/** A gallery after adding `picked`: in order, skipping photos already in it. */
export function withAddedIds(
  ids: readonly string[],
  picked: readonly string[],
): string[] {
  return [...ids, ...picked.filter((id) => !ids.includes(id))];
}

/** One place where an image appears, for the Medios page. */
export interface MediaUse {
  /** Title of the project or news item ("Sin título" when empty). */
  label: string;
  kind: "Proyecto" | "Noticia" | "Inicio";
  /** What the image is there, in order: "portada", "galería"… */
  roles: string[];
  /** Editor where it can be changed. */
  href: string;
}

interface UsesMedia {
  id: string;
  title: string;
  coverMediaId: string | null;
  gallery: readonly string[];
  seo: { ogImageMediaId?: string | null };
}

/**
 * Where each image is used: covers, galleries and share images of projects
 * and news, and the photos of the home hero. Images used nowhere are not
 * in the map. Deleting a used image clears those places (API rule), so the
 * page warns before.
 */
export function mediaUsage({
  projects,
  news,
  hero,
}: {
  projects: readonly UsesMedia[];
  news: readonly UsesMedia[];
  hero: { photos: readonly { mediaId: string }[] } | null;
}): Map<string, MediaUse[]> {
  const usage = new Map<string, MediaUse[]>();
  const add = (id: string, use: Omit<MediaUse, "roles">, role: string) => {
    const list = usage.get(id) ?? [];
    const existing = list.find((u) => u.href === use.href);
    if (existing) {
      if (!existing.roles.includes(role)) existing.roles.push(role);
    } else {
      list.push({ ...use, roles: [role] });
    }
    usage.set(id, list);
  };
  const scan = (
    items: readonly UsesMedia[],
    kind: "Proyecto" | "Noticia",
    path: string,
  ) => {
    for (const item of items) {
      const use = {
        label: item.title.trim() || "Sin título",
        kind,
        href: `/admin/${path}/editar?id=${encodeURIComponent(item.id)}`,
      };
      if (item.coverMediaId) add(item.coverMediaId, use, "portada");
      for (const id of item.gallery) add(id, use, "galería");
      if (item.seo.ogImageMediaId) {
        add(item.seo.ogImageMediaId, use, "imagen para compartir");
      }
    }
  };
  scan(projects, "Proyecto", "proyectos");
  scan(news, "Noticia", "noticias");
  for (const photo of hero?.photos ?? []) {
    add(
      photo.mediaId,
      { label: "Portada del sitio", kind: "Inicio", href: "/admin/portada" },
      "foto",
    );
  }
  return usage;
}
