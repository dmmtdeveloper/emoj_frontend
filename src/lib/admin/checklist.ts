/**
 * The publishing checklist beside the project and news editors: required
 * and recommended items apart, how many required ones are done, and the
 * line under them. A published item never gets "para publicar".
 */

interface Item {
  required: boolean;
  done: boolean;
}

export interface ChecklistSummary<T extends Item> {
  required: T[];
  recommended: T[];
  requiredDone: number;
  /** Required items still to do. */
  missing: number;
  message: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function checklistSummary<T extends Item>(
  checklist: readonly T[],
  published: boolean,
): ChecklistSummary<T> {
  const required = checklist.filter((i) => i.required);
  const recommended = checklist.filter((i) => !i.required);
  const requiredDone = required.filter((i) => i.done).length;
  const missing = required.length - requiredDone;
  const data = `${missing} ${plural(missing, "dato obligatorio", "datos obligatorios")}`;
  const message =
    missing === 0
      ? published
        ? "Publicado. Los cambios que guardes se ven en el sitio al momento."
        : "Listo para publicar."
      : published
        ? `Ya está en el sitio, pero le ${plural(missing, "falta", "faltan")} ${data}. ${plural(missing, "Complétalo", "Complétalos")} para que la ficha quede completa.`
        : `${plural(missing, "Falta", "Faltan")} ${data} para publicar.`;
  return { required, recommended, requiredDone, missing, message };
}
