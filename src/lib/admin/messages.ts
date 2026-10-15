/**
 * Pure helpers for the Mensajes inbox (src/admin/messages.tsx): the sender's
 * initials and first name, and the links to answer them by email, phone or
 * WhatsApp.
 */

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** RFC 6068 wants %20 for spaces: some mail apps show "+" literally. */
function mailtoParam(value: string): string {
  return encodeURIComponent(value).replace(/%0A/g, "%0D%0A");
}

/**
 * "Responder por correo": a new email to the sender with a subject naming
 * the service, a greeting with their first name and their message quoted
 * below, so the reply keeps the context.
 */
export function replyMailto(
  message: { name: string; email: string; message: string },
  serviceTitle: string | undefined,
): string {
  const subject = serviceTitle
    ? `Tu consulta a EMOJ Consultora: ${serviceTitle}`
    : "Tu consulta a EMOJ Consultora";
  const name = firstName(message.name);
  const quoted = message.message
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const body = `Hola${name ? ` ${name}` : ""},\n\n\n\n— Tu mensaje —\n${quoted}`;
  return `mailto:${message.email}?subject=${mailtoParam(subject)}&body=${mailtoParam(body)}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * wa.me link for Chilean mobile numbers (9 followed by 8 digits, with or
 * without +56). Landlines and other numbers get no WhatsApp button.
 */
export function whatsappHref(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("56")) digits = digits.slice(2);
  return /^9\d{8}$/.test(digits) ? `https://wa.me/56${digits}` : null;
}
