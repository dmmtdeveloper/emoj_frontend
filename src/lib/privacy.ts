/**
 * Privacy policy content (Ley 21.719, in force from 2026-12-01), rendered by
 * src/pages/privacidad.astro. Plain data so the page, the contact form, the
 * admin's access export and tests share one source.
 *
 * Built from what the site and the API really do, and checked item by item
 * against art. 14 ter (duty to inform), art. 11 (request procedure) and the
 * transfer rules (arts. 27-28). `privacyGaps` lists the facts and agreements
 * EMOJ still has to provide; while anything is missing the page is kept out
 * of search engines.
 */
import { CONTACT, LEGAL_NAME, RUT } from "./site";

export interface ProcessingActivity {
  /** Stable key, used by the access export to pick its activities. */
  id: "contact" | "spam" | "security" | "admin" | "requests";
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
  version: "1.0",
  updated: "2026-10-06",
  controller: {
    name: LEGAL_NAME,
    rut: RUT,
    address,
    representative: "Eduardo Moisés Olguín Jil",
  },
  requestsEmail: CONTACT.email,
  audience: [
    "Personas que nos escriben por el formulario de contacto: clientes, posibles clientes y quienes los representan.",
    "Personas que nos piden ejercer sus derechos sobre sus datos.",
    "Personal de EMOJ con acceso al panel de administración del sitio.",
    "Visitantes del sitio, solo por las señales técnicas que se describen abajo, que no guardamos.",
  ],
  sources:
    "Todos los datos los entregas tú al escribirnos, o los genera tu navegador al usar el sitio. No compramos datos ni los obtenemos de fuentes de acceso público.",
  activities: [
    {
      id: "contact",
      source: "Formulario de contacto",
      data: "Nombre, correo, teléfono, empresa, servicio de interés, ubicación del proyecto y tu mensaje.",
      purpose:
        "Responder tu consulta, preparar una cotización y hacer seguimiento.",
      basis:
        "Tu solicitud: tratamos los datos para tomar las medidas previas a un contrato que tú pides.",
      retention:
        "24 meses desde nuestro último intercambio; después se borran, también de nuestro correo.",
    },
    {
      id: "spam",
      source: "Protección contra spam",
      data: "Señales técnicas de tu navegador (dirección IP, navegador y huella de la conexión), analizadas por Cloudflare Turnstile al enviar el formulario.",
      purpose:
        "Comprobar que el formulario lo envía una persona y no un robot.",
      basis:
        "Interés legítimo: proteger el sitio y nuestro correo contra envíos automáticos.",
      retention:
        "No las guardamos: Cloudflare las trata según su propia política.",
    },
    {
      id: "security",
      source: "Seguridad del sitio",
      data: "Tu dirección IP, usada en el momento para limitar envíos repetidos.",
      purpose: "Evitar abusos y ataques al formulario y a la API.",
      basis: "Interés legítimo: mantener el sitio seguro y disponible.",
      retention:
        "Solo en memoria mientras dura el límite; no la guardamos en registros.",
    },
    {
      id: "admin",
      source: "Panel de administración (solo personal de EMOJ)",
      data: "Nombre, correo, dirección IP, navegador y fecha del último acceso.",
      purpose: "Dar acceso seguro a quien publica contenido en el sitio.",
      basis:
        "Relación laboral con EMOJ e interés legítimo en la seguridad del panel.",
      retention:
        "Las sesiones se borran al expirar; la cuenta, cuando la persona deja de necesitar acceso.",
    },
    {
      id: "requests",
      source: "Solicitudes sobre tus datos",
      data: "Tu correo, qué pediste, cuántos mensajes abarcó, la fecha y quién de EMOJ la atendió.",
      purpose: "Acreditar que respondimos tu solicitud dentro del plazo legal.",
      basis:
        "Obligación legal: la Ley 21.719 nos pide poder demostrar nuestras respuestas.",
      retention:
        "4 años desde la solicitud, el plazo en que se puede revisar su cumplimiento.",
    },
  ],
  processors: [
    {
      name: "Vercel",
      role: "Aloja el sitio web.",
      country: "Estados Unidos y su red de servidores en el mundo",
      safeguard: dpa,
      agreement: true,
    },
    {
      name: "Railway",
      role: "Aloja la API, la base de datos y las imágenes.",
      country: "Estados Unidos",
      safeguard: dpa,
      agreement: false,
    },
    {
      name: "Resend",
      role: "Envía a nuestro correo los mensajes del formulario.",
      country: "Estados Unidos",
      safeguard: dpa,
      agreement: true,
    },
    {
      name: "Cloudflare",
      role: "Protege el formulario contra spam. También usa esas señales, por su cuenta, para mejorar su detección de robots.",
      country: "Estados Unidos y su red de servidores en el mundo",
      safeguard: dpa,
      agreement: true,
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
    "No tomamos decisiones automatizadas sobre ti ni elaboramos perfiles. La única evaluación automática es la de Cloudflare Turnstile, que solo comprueba que el formulario no lo envíe un robot.",
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
    "Todo el sitio y la API funcionan con conexión cifrada (HTTPS).",
    "Solo el personal autorizado de EMOJ entra al panel, con un usuario propio; las contraseñas se guardan cifradas con argon2id y las sesiones expiran.",
    "El formulario tiene protección contra spam y un límite de envíos repetidos.",
    "Los mensajes se borran solos al cumplir su plazo, y cada solicitud sobre datos personales queda registrada.",
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
  for (const p of policy.processors) {
    if (!p.agreement) {
      gaps.push(`Acuerdo de tratamiento de datos firmado con ${p.name}`);
    }
  }
  return gaps;
}
