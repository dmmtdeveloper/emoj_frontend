/**
 * Privacy policy content (Ley 21.719, in force from 2026-12-01), rendered by
 * src/pages/privacidad.astro. Plain data so the page and tests share one
 * source. The site is static: no contact form, accounts or database.
 * Visitors reach EMOJ by WhatsApp, email or phone, and the host (Railway)
 * keeps short-lived request logs.
 *
 * Built from what the site and EMOJ really do, and checked item by item
 * against art. 14 ter (duty to inform), art. 11 (request procedure) and the
 * transfer rules (arts. 27-28). `privacyGaps` lists the facts and agreements
 * EMOJ still has to provide; while anything is missing the page is kept out
 * of search engines.
 */
import { CONTACT, LEGAL_NAME, RUT } from "./site";

export interface ProcessingActivity {
  /** Stable key, used by the access export to pick its activities. */
  id: "contact" | "hosting" | "requests";
  /** Where the data comes from, in the visitor's words. */
  source: string;
  data: string;
  purpose: string;
  basis: string;
  /** How long the data is kept; null until EMOJ sets the period (a gap). */
  retention: string | null;
}

export interface Processor {
  name: string;
  role: string;
  /** Where it stores or processes the data. */
  country: string;
  /** Why the transfer is lawful (arts. 27-28) or why there is none. */
  safeguard: string;
  /** Art. 15 bis: a processing agreement with EMOJ is in force. */
  agreement: boolean;
}

export interface Right {
  name: string;
  text: string;
}

export interface PrivacyPolicy {
  /** Art. 14 ter a: version of the text, bumped on every change. */
  version: string;
  /** Last change to the text, shown on the page (YYYY-MM-DD). */
  updated: string;
  controller: {
    name: string;
    /** Company tax ID; null until EMOJ confirms it. */
    rut: string | null;
    address: string;
    /** Art. 14 ter b: legal representative (EMOJ's general manager). */
    representative: string | null;
  };
  /** Mailbox for data requests; null until it exists. */
  requestsEmail: string | null;
  /** Art. 14 ter d: who the stored data is about. */
  audience: readonly string[];
  /** Art. 14 ter j: where the data comes from. */
  sources: string;
  activities: readonly ProcessingActivity[];
  processors: readonly Processor[];
  /** Art. 14 ter h: whether the destination countries are adequate. */
  transfers: string;
  /** Art. 14 ter l: automated decisions and profiling. */
  automatedDecisions: string;
  rights: readonly Right[];
  /** Art. 11: how a request is handled, in order. */
  requestSteps: readonly string[];
  /** Art. 14 ter g and art. 41: claiming before the Agency. */
  claim: string;
  /** Art. 14 ter e: security policy and measures. */
  security: readonly string[];
}

const address = `${CONTACT.address.street}, ${CONTACT.address.locality}, ${CONTACT.address.region}, Chile`;

const dpa =
  "Acuerdo de tratamiento de datos del proveedor, con cláusulas contractuales tipo de protección.";

export const PRIVACY: PrivacyPolicy = {
  version: "1.3",
  updated: "2026-11-03",
  controller: {
    name: LEGAL_NAME,
    rut: RUT,
    address,
    representative: "Eduardo Moisés Olguín Jil",
  },
  requestsEmail: CONTACT.email,
  audience: [
    "Personas que nos escriben por WhatsApp, correo o teléfono.",
    "Personas que nos piden ejercer sus derechos sobre sus datos.",
    "Visitantes del sitio, solo por los registros técnicos de visita que se describen abajo.",
  ],
  sources:
    "El sitio no tiene formulario de contacto ni cuentas de usuario, y no guarda datos: para escribirnos o cotizar un proyecto, usa WhatsApp, el correo o el teléfono. Todos los datos los entregas tú al escribirnos, o los genera tu navegador al visitar el sitio. No compramos datos ni los obtenemos de fuentes de acceso público.",
  activities: [
    {
      id: "contact",
      source: "Mensajes que nos envías",
      data: "Tu nombre, tu número o correo y lo que nos cuentas cuando nos escribes por WhatsApp o correo, o nos llamas por teléfono.",
      purpose: "Responderte y, si lo pides, preparar una cotización.",
      basis:
        "Tu solicitud: los usamos para responder lo que nos preguntas, antes de cualquier contrato.",
      retention: null,
    },
    {
      id: "hosting",
      source: "Visitas al sitio",
      data: "Tu dirección IP, tu navegador, la página que visitas y la hora, que el proveedor de alojamiento registra en cada visita.",
      purpose: "Mantener el sitio funcionando y detectar fallas o abusos.",
      basis: "Interés legítimo: mantener el sitio seguro y disponible.",
      retention:
        "7 días; luego el proveedor los borra. No los usamos para identificarte ni para analítica.",
    },
    {
      id: "requests",
      source: "Solicitudes sobre tus datos",
      data: "Tu correo, qué pediste, la fecha y quién de EMOJ la atendió.",
      purpose: "Acreditar que respondimos tu solicitud dentro del plazo legal.",
      basis:
        "Obligación legal: la Ley 21.719 nos pide poder demostrar nuestras respuestas.",
      retention:
        "4 años desde la solicitud, el plazo en que se puede revisar su cumplimiento.",
    },
  ],
  processors: [
    {
      name: "Railway",
      role: "Aloja el sitio web y registra las visitas por 7 días.",
      country: "Estados Unidos",
      safeguard: dpa,
      agreement: false,
    },
    {
      name: "WhatsApp (Meta)",
      role: "Recibimos por WhatsApp los mensajes que nos envías.",
      country: "Estados Unidos",
      safeguard: dpa,
      agreement: false,
    },
    {
      name: "Chilecom Datacenter",
      role: "Aloja nuestro correo electrónico, donde recibimos tus mensajes.",
      country: "Chile",
      safeguard: "Los datos no salen de Chile.",
      agreement: false,
    },
  ],
  transfers:
    "La Agencia de Protección de Datos Personales todavía no declara a Estados Unidos como país con un nivel adecuado de protección. Por eso los datos que viajan allá se protegen con el acuerdo de tratamiento de datos que tenemos con cada proveedor, que lo obliga a usarlos solo para prestarnos su servicio, mantenerlos seguros y borrarlos al terminar.",
  automatedDecisions:
    "No tomamos decisiones automatizadas sobre ti ni elaboramos perfiles.",
  rights: [
    {
      name: "Acceso",
      text: "Saber si tratamos tus datos, cuáles, de dónde vienen, para qué, con quién los compartimos y por cuánto tiempo.",
    },
    {
      name: "Rectificación",
      text: "Corregir datos inexactos, desactualizados o incompletos.",
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
      text: "Recibir los datos que nos diste en un formato estructurado y de uso común.",
    },
    {
      name: "Bloqueo temporal",
      text: "Pedir que suspendamos el uso de tus datos mientras resolvemos una solicitud de rectificación, supresión u oposición.",
    },
  ],
  requestSteps: [
    "Escríbenos desde el correo con el que nos contactaste, así sabemos que eres tú. Indica qué derecho quieres ejercer y, si pides rectificar, suprimir u oponerte, qué quieres cambiar y por qué.",
    "Te confirmamos que la recibimos.",
    "Te respondemos por escrito a ese mismo correo dentro de 30 días corridos. Si necesitamos más tiempo, te avisaremos y lo extenderemos una sola vez, por hasta 30 días más.",
    "Si junto con tu solicitud pides el bloqueo temporal de tus datos, te respondemos esa petición dentro de 2 días hábiles y no usamos esos datos mientras tanto.",
    "Si no podemos acoger tu solicitud, en todo o en parte, te explicamos el motivo.",
  ],
  claim:
    "Si rechazamos tu solicitud o no te respondemos a tiempo, puedes reclamar ante la Agencia de Protección de Datos Personales dentro de los 30 días hábiles siguientes a nuestra respuesta o al vencimiento del plazo.",
  security: [
    "Todo el sitio funciona con conexión cifrada (HTTPS) y cabeceras de seguridad estrictas.",
    "El sitio no te pide datos ni los guarda: no tiene cuentas de usuario ni base de datos.",
    "Solo el personal de EMOJ que atiende consultas accede al correo y al WhatsApp de la empresa.",
    "Revisamos estas medidas al menos una vez al año.",
  ],
};

/** What is still missing before the policy can be published. */
export function privacyGaps(policy: PrivacyPolicy): string[] {
  const gaps: string[] = [];
  if (!policy.controller.rut) gaps.push(`RUT de ${policy.controller.name}`);
  if (!policy.controller.representative) {
    gaps.push("Nombre del representante legal");
  }
  if (!policy.requestsEmail) {
    gaps.push(
      "Correo para ejercer los derechos (por ejemplo privacidad@emoj.cl)",
    );
  }
  for (const a of policy.activities) {
    if (!a.retention) gaps.push(`Plazo de conservación: ${a.source}`);
  }
  for (const p of policy.processors) {
    if (!p.agreement) {
      gaps.push(`Acuerdo de tratamiento de datos firmado con ${p.name}`);
    }
  }
  return gaps;
}
