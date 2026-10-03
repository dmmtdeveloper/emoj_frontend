/**
 * Company facts shared by the layout, pages and structured data.
 * Keep this the single source: every value here is real, public data.
 */

export const SITE_NAME = "EMOJ Consultora";
export const LEGAL_NAME = "EMOJ Consultora SpA";
export const TAGLINE = "Humanizamos la ingeniería";

export const CONTACT = {
  email: "coordinacion@emoj.cl",
  whatsapp: {
    display: "+56 9 9158 9934",
    href: "https://wa.me/56991589934?text=Hola%2C%20quiero%20cotizar%20un%20proyecto",
  },
  phones: [
    { display: "(32) 292 7790", href: "tel:+56322927790" },
    { display: "(32) 292 0784", href: "tel:+56322920784" },
  ],
  address: {
    street: "Federico Errázuriz #843, Dpto 43",
    locality: "Quilpué",
    region: "Región de Valparaíso",
    country: "CL",
  },
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=Federico+Err%C3%A1zuriz+843%2C+Quilpu%C3%A9%2C+Chile",
} as const;

export const SOCIAL = [
  {
    name: "Facebook",
    href: "https://web.facebook.com/profile.php?id=61574540033917",
  },
  { name: "Instagram", href: "https://www.instagram.com/emojconsultora" },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/emoj-consultora-spa/",
  },
] as const;

export const NAV = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "Proyectos", href: "/proyectos" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Noticias", href: "/noticias" },
  { label: "Contacto", href: "/contacto" },
] as const;

/** Reference clients (public on the current emoj.cl). */
export const CLIENTS = [
  "ESVAL",
  "Aguas del Valle",
  "SAAM",
  "AES Andes",
  "CODELCO",
  "GNL Quintero",
] as const;

export const MISSION =
  "Proporcionar soluciones integrales en ingeniería civil a empresas de distintos tamaños en Chile, con un enfoque personalizado en el diseño, proyección y supervisión de proyectos de ingeniería multidisciplinaria.";

/** Whether `href` is the current section for `pathname` (for aria-current). */
export function isCurrent(href: string, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}
