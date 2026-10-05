/**
 * Field errors from an API problem (409 slug in use, 422 invalid fields),
 * translated to Spanish and keyed by the editor's form fields. Shared by the
 * project and news editors; each passes its own field map.
 */
import type { FieldError } from "../api/client";

export const tooLong = (max: number) =>
  `Puede tener hasta ${max.toLocaleString("es-CL")} caracteres.`;

export interface FieldErrorOptions<F extends string> {
  /** API field name (e.g. "seo.description") → form field. */
  fields: Readonly<Record<string, F>>;
  /** Message for a slug already in use (409). */
  slugTaken: string;
  /** Specific wording for some fields when the API message is generic. */
  fallbacks?: Partial<Record<F, string>>;
}

function translate<F extends string>(
  status: number,
  field: F,
  message: string,
  options: FieldErrorOptions<F>,
): string {
  if (status === 409 && field === "slug") return options.slugTaken;
  const max = /at most (\d+)/.exec(message);
  if (max) return tooLong(Number(max[1]));
  if (/required to publish/.test(message)) {
    return "Es obligatorio para publicar.";
  }
  if (/required/.test(message)) return "Este campo es obligatorio.";
  if (field === "slug") {
    return "Usa solo minúsculas sin tildes, números y guiones simples.";
  }
  return options.fallbacks?.[field] ?? "Revisa este campo.";
}

/** Fields the form does not show are listed in `other`. */
export function fieldErrors<F extends string>(
  status: number,
  errors: readonly FieldError[],
  options: FieldErrorOptions<F>,
): { fields: Partial<Record<F, string>>; other: string[] } {
  const fields: Partial<Record<F, string>> = {};
  const other: string[] = [];
  for (const { field, message } of errors) {
    const name = options.fields[field];
    if (!name) {
      other.push(field);
      continue;
    }
    fields[name] ??= translate(status, name, message, options);
  }
  return { fields, other };
}
