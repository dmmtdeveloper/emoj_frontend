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
