/**
 * WhatsApp links with a message that fits the page: on a service, project
 * or article the chat opens already saying what the visitor was looking at,
 * so EMOJ knows the context from the first message.
 */
const NUMBER = "56991589934";

/** Titles beyond this are cut so the message stays readable. */
const MAX_TITLE = 80;

export type WhatsAppContext =
  | { kind: "service"; title: string }
  | { kind: "project"; title: string }
  | { kind: "article"; title: string };

function short(title: string): string {
  const clean = title.trim();
  return clean.length <= MAX_TITLE
    ? clean
    : `${clean.slice(0, MAX_TITLE - 1)}…`;
}

export function whatsappMessage(context?: WhatsAppContext): string {
  switch (context?.kind) {
    case "service":
      return `Hola, quiero cotizar un proyecto de ${context.title.trim().toLowerCase()}.`;
    case "project":
      return `Hola, vi el proyecto «${short(context.title)}» en emoj.cl y quiero cotizar algo similar.`;
    case "article":
      return `Hola, leí «${short(context.title)}» en emoj.cl y quiero conversar sobre un proyecto.`;
    default:
      return "Hola, quiero cotizar un proyecto.";
  }
}

export function whatsappHref(context?: WhatsAppContext): string {
  return `https://wa.me/${NUMBER}?text=${encodeURIComponent(whatsappMessage(context))}`;
}
