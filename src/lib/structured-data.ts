import { CONTACT, LEGAL_NAME, SITE_NAME, SOCIAL, TAGLINE } from "./site";

const DEFAULT_SITE = new URL("https://emoj.cl");

/** schema.org `ProfessionalService` for EMOJ (home and contact pages). */
export function organizationJsonLd(site: URL | undefined = DEFAULT_SITE) {
  const base = site ?? DEFAULT_SITE;
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": new URL("/#organizacion", base).href,
    name: SITE_NAME,
    legalName: LEGAL_NAME,
    slogan: TAGLINE,
    description:
      "Consultora de ingeniería civil con más de 30 años de experiencia: obras sanitarias, viales, cálculo estructural, geotecnia, estudios de tránsito, arquitectura y aguas lluvias.",
    url: base.href,
    logo: new URL("/icon-512.png", base).href,
    image: new URL("/og-default.jpg", base).href,
    email: CONTACT.email,
    telephone: CONTACT.phones.map((phone) => phone.href.replace("tel:", "")),
    address: {
      "@type": "PostalAddress",
      streetAddress: CONTACT.address.street,
      addressLocality: CONTACT.address.locality,
      addressRegion: CONTACT.address.region,
      addressCountry: CONTACT.address.country,
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Región de Valparaíso" },
      { "@type": "AdministrativeArea", name: "Región de Coquimbo" },
    ],
    sameAs: SOCIAL.map((profile) => profile.href),
  };
}
