/**
 * Privacy policy content (Ley 21.719, in force from 2026-12-01), rendered by
 * src/pages/privacidad.astro. Plain data so the page, the contact form and
 * tests share one source.
 *
 * This is a draft built from what the site and the API really do (see the
 * plan's Fase 16). It must be reviewed by a lawyer before launch:
 * `privacyGaps` lists what is still missing, and while anything is missing
 * the page is kept out of search engines.
 */
import { CONTACT, LEGAL_NAME } from "./site";

export interface ProcessingActivity {
  /** Where the data comes from, in the visitor's words. */
  source: string;
  data: string;
  purpose: string;
  basis: string;
  retention: string;
}

export interface Processor {
  name: string;
  role: string;
}

export interface Right {
  name: string;
  text: string;
}

export interface PrivacyPolicy {
  controller: {
    name: string;
    /** Company tax ID; null until EMOJ confirms it. */
    rut: string | null;
    address: string;
  };
  /** Mailbox for data requests; null until it exists. */
  requestsEmail: string | null;
  /** Date (YYYY-MM-DD) a lawyer approved the text; null while a draft. */
  legalReview: string | null;
  /** Last change to the text, shown on the page (YYYY-MM-DD). */
  updated: string;
  activities: readonly ProcessingActivity[];
  processors: readonly Processor[];
  rights: readonly Right[];
  /** Legal deadline to answer a request. */
  responseTime: string;
}

const address = `${CONTACT.address.street}, ${CONTACT.address.locality}, ${CONTACT.address.region}, Chile`;

export const PRIVACY: PrivacyPolicy = {
  controller: { name: LEGAL_NAME, rut: null, address },
  requestsEmail: null,
  legalReview: null,
  updated: "2026-10-06",
  activities: [
    {
      source: "Formulario de contacto",
      data: "Nombre, correo, teléfono, empresa, servicio de interés, ubicación del proyecto y tu mensaje.",
      purpose:
        "Responder tu consulta, preparar una cotización y hacer seguimiento.",
      basis:
        "Tu solicitud: tratamos los datos para tomar las medidas previas a un contrato que tú pides.",
      retention:
        "24 meses desde nuestro último intercambio; después se borran.",
    },
    {
      source: "Protección contra spam",
      data: "Señales técnicas de tu navegador, analizadas por Cloudflare Turnstile al enviar el formulario.",
      purpose:
        "Comprobar que el formulario lo envía una persona y no un robot.",
      basis: "Interés legítimo en proteger el sitio contra abusos.",
      retention:
        "No las guardamos: Cloudflare las trata según su propia política.",
    },
    {
      source: "Seguridad del sitio",
      data: "Tu dirección IP, usada en el momento para limitar envíos repetidos.",
      purpose: "Evitar abusos y ataques al formulario y a la API.",
      basis: "Interés legítimo en la seguridad del sitio.",
      retention:
        "Solo en memoria mientras dura el límite; no la guardamos en registros.",
    },
    {
      source: "Panel de administración (solo personal de EMOJ)",
      data: "Nombre, correo, dirección IP, navegador y fecha del último acceso.",
      purpose: "Dar acceso seguro a quien publica contenido en el sitio.",
      basis: "Relación laboral e interés legítimo en la seguridad.",
      retention: "Las sesiones se borran al expirar.",
    },
  ],
  processors: [
    { name: "Vercel", role: "Aloja el sitio web." },
    { name: "Railway", role: "Aloja la API, la base de datos y las imágenes." },
    { name: "Resend", role: "Envía los correos del formulario." },
    { name: "Cloudflare", role: "Protege el formulario contra spam." },
  ],
  rights: [
    {
      name: "Acceso",
      text: "Saber si tratamos tus datos, cuáles y para qué.",
    },
    {
      name: "Rectificación",
      text: "Corregir datos inexactos o incompletos.",
    },
    {
      name: "Supresión",
      text: "Pedir que borremos tus datos cuando ya no sean necesarios o no corresponda tratarlos.",
    },
    {
      name: "Oposición",
      text: "Oponerte a que usemos tus datos para una finalidad determinada.",
    },
    {
      name: "Portabilidad",
      text: "Recibir tus datos en un formato estructurado y de uso común.",
    },
    {
      name: "Bloqueo temporal",
      text: "Pedir que suspendamos el tratamiento mientras se resuelve una solicitud tuya.",
    },
  ],
  responseTime:
    "30 días corridos desde que recibimos tu solicitud, prorrogables una vez por el mismo plazo si es necesario (te avisaremos).",
};

/** What is still missing before the policy can be published. */
export function privacyGaps(policy: PrivacyPolicy): string[] {
  const gaps: string[] = [];
  if (!policy.controller.rut) gaps.push(`RUT de ${policy.controller.name}`);
  if (!policy.requestsEmail) {
    gaps.push(
      "Correo para ejercer los derechos (por ejemplo privacidad@emoj.cl)",
    );
  }
  if (!policy.legalReview) gaps.push("Revisión de un abogado");
  return gaps;
}
