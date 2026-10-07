/**
 * Helpers for data subject requests in the admin (Ley 21.719): checking the
 * email the editor types, naming and writing the export file, and labelling
 * the audit trail. The API matches the email case-insensitively.
 */
import { PRIVACY, type PrivacyPolicy } from "../privacy";
import type { DataRequest, PersonDataExport } from "./api";

/** Canonical address of the policy (the admin may run on a preview host). */
const POLICY_URL = "https://emoj.cl/privacidad";

/** Same limit as the API (RFC 5321 path length). */
const MAX_EMAIL = 254;

/** Spanish error for the email field, or null when it can be sent. */
export function subjectEmailError(input: string): string | null {
  const email = input.trim();
  if (email === "") return "Escribe el correo de la persona.";
  if (email.length > MAX_EMAIL) return "El correo es demasiado largo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Revisa el correo: debe tener la forma nombre@dominio.cl.";
  }
  return null;
}

const chileDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "datos-personales-ana-perez-empresa-cl-2026-10-06.json" */
export function exportFileName(email: string, generatedAt: string): string {
  const slug = email
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `datos-personales-${slug}-${chileDate.format(new Date(generatedAt))}.json`;
}

/** Activities whose data the export contains. */
const EXPORTED_ACTIVITIES = new Set(["contact", "requests"]);

/**
 * The answer to an access request: the exported data plus what art. 5 of
 * Ley 21.719 requires alongside it (origin, purposes, recipients, retention
 * and the legal basis), taken from the published policy. Labels stay in
 * English as part of the file format; the values are in Spanish.
 */
export function accessReport(
  data: PersonDataExport,
  policy: PrivacyPolicy = PRIVACY,
) {
  const { controller } = policy;
  return {
    ...data,
    information: {
      controller: {
        name: controller.name,
        rut: controller.rut,
        email: policy.requestsEmail,
      },
      source: policy.sources,
      processing: policy.activities
        .filter((a) => EXPORTED_ACTIVITIES.has(a.id))
        .map((a) => ({
          activity: a.source,
          data: a.data,
          purpose: a.purpose,
          legalBasis: a.basis,
          retention: a.retention,
        })),
      recipients: policy.processors.map((p) => ({
        name: p.name,
        role: p.role,
        country: p.country,
        safeguard: p.safeguard,
      })),
      automatedDecisions: policy.automatedDecisions,
      policy: `${POLICY_URL} (versión ${policy.version})`,
    },
  };
}

/** The export as indented JSON (structured, common format: portability). */
export function exportFileContent(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

/** "Exportación · 3 mensajes" */
export function dataRequestLabel(
  kind: DataRequest["kind"],
  messages: number,
): string {
  const action = kind === "export" ? "Exportación" : "Eliminación";
  const count =
    messages === 0
      ? "sin mensajes"
      : `${messages} ${messages === 1 ? "mensaje" : "mensajes"}`;
  return `${action} · ${count}`;
}
