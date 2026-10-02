/**
 * Contact form rules, mirroring `ContactRequest` in the API contract so the
 * visitor gets the same answer before and after the request. Pure functions:
 * the browser script in `ContactForm.astro` only wires them to the DOM.
 */
import type {
  ApiResult,
  ContactCreated,
  ContactRequest,
  FieldError,
} from "../api/client";
import { isServiceSlug } from "../services";

export const CONTACT_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "service",
  "location",
  "message",
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactValues = Record<ContactField, string>;
export type FieldErrors = Partial<Record<ContactField, string>>;

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;

const MAX_LENGTH: Record<Exclude<ContactField, "service">, number> = {
  name: 120,
  email: 254,
  phone: 40,
  company: 120,
  location: 120,
  message: MESSAGE_MAX,
};

// Same practical shape check as most mail clients: something@domain.tld.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MESSAGES = {
  nameRequired: "Ingresa tu nombre.",
  emailRequired: "Ingresa tu correo.",
  emailInvalid: "Ingresa un correo válido, por ejemplo nombre@empresa.cl.",
  messageShort: `Cuéntanos tu proyecto en al menos ${MESSAGE_MIN} caracteres.`,
  messageLong: "El mensaje puede tener hasta 5.000 caracteres.",
  serviceInvalid: "Elige un servicio de la lista.",
  captcha: "Completa la verificación de seguridad e inténtalo de nuevo.",
  tooMany:
    "Has enviado varias consultas seguidas. Intenta de nuevo en unos minutos.",
  generic:
    "No pudimos enviar tu consulta. Inténtalo de nuevo o escríbenos a coordinacion@emoj.cl.",
} as const;

const tooLong = (max: number) => `Puede tener hasta ${max} caracteres.`;

/** Length in Unicode code points, like the Go API counts runes. */
const length = (value: string) => [...value].length;

export function validateContact(values: ContactValues): FieldErrors {
  const errors: FieldErrors = {};
  const v = Object.fromEntries(
    CONTACT_FIELDS.map((field) => [field, values[field].trim()]),
  ) as ContactValues;

  if (v.name === "") errors.name = MESSAGES.nameRequired;

  if (v.email === "") errors.email = MESSAGES.emailRequired;
  else if (!EMAIL_PATTERN.test(v.email)) errors.email = MESSAGES.emailInvalid;

  if (length(v.message) < MESSAGE_MIN) errors.message = MESSAGES.messageShort;
  else if (length(v.message) > MESSAGE_MAX)
    errors.message = MESSAGES.messageLong;

  if (v.service !== "" && !isServiceSlug(v.service))
    errors.service = MESSAGES.serviceInvalid;

  for (const [field, max] of Object.entries(MAX_LENGTH) as [
    keyof typeof MAX_LENGTH,
    number,
  ][]) {
    if (errors[field] === undefined && length(v[field]) > max) {
      errors[field] = tooLong(max);
    }
  }

  return errors;
}

/** Build the API body: trimmed values, empty optional fields omitted. */
export function toContactRequest(
  values: ContactValues,
  turnstileToken: string,
): ContactRequest {
  const v = (field: ContactField) => values[field].trim();
  const optional = (field: "phone" | "company" | "location") =>
    v(field) === "" ? {} : { [field]: v(field) };
  const service = v("service");

  return {
    name: v("name"),
    email: v("email"),
    ...optional("phone"),
    ...optional("company"),
    ...(isServiceSlug(service) ? { service } : {}),
    ...optional("location"),
    message: v("message"),
    turnstileToken,
  };
}

export type SubmitOutcome =
  | { kind: "success" }
  | { kind: "invalid"; fieldErrors: FieldErrors; captchaFailed: boolean }
  | { kind: "error"; message: string };

const FIELD_MESSAGES: Record<ContactField, string> = {
  name: "Revisa tu nombre.",
  email: MESSAGES.emailInvalid,
  phone: "Revisa el teléfono.",
  company: "Revisa el nombre de la empresa.",
  service: MESSAGES.serviceInvalid,
  location: "Revisa la ubicación.",
  message: `El mensaje debe tener entre ${MESSAGE_MIN} y 5.000 caracteres.`,
};

function isContactField(field: string): field is ContactField {
  return (CONTACT_FIELDS as readonly string[]).includes(field);
}

function mapFieldErrors(errors: FieldError[]): FieldErrors {
  const mapped: FieldErrors = {};
  for (const { field } of errors) {
    if (isContactField(field)) mapped[field] = FIELD_MESSAGES[field];
  }
  return mapped;
}

/** Turn an API result into what the form should show. */
export function describeSubmitResult(
  result: ApiResult<ContactCreated>,
): SubmitOutcome {
  if (result.ok) return { kind: "success" };
  if (result.kind === "problem") {
    if (result.status === 422 && result.problem.errors) {
      return {
        kind: "invalid",
        fieldErrors: mapFieldErrors(result.problem.errors),
        captchaFailed: result.problem.errors.some(
          (error) => error.field === "turnstileToken",
        ),
      };
    }
    if (result.status === 429)
      return { kind: "error", message: MESSAGES.tooMany };
  }
  return { kind: "error", message: MESSAGES.generic };
}
