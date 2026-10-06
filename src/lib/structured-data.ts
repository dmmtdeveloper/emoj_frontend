import { CONTACT, LEGAL_NAME, RUT, SITE_NAME, SOCIAL, TAGLINE } from "./site";

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
    taxID: RUT,
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

function organizationRef(base: URL) {
  return { "@id": new URL("/#organizacion", base).href };
}

export interface ProjectJsonLdInput {
  url: string;
  title: string;
  summary: string;
  location: string;
  region: string;
  client: string;
  year?: number;
  serviceNames: string[];
  image?: string;
}

/** schema.org `CreativeWork` for a portfolio project (known facts only). */
export function projectJsonLd(
  project: ProjectJsonLdInput,
  site: URL | undefined = DEFAULT_SITE,
) {
  const base = site ?? DEFAULT_SITE;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: project.url,
    ...(project.image ? { image: project.image } : {}),
    creator: organizationRef(base),
    about: project.serviceNames,
    ...(project.year ? { dateCreated: String(project.year) } : {}),
    ...(project.client
      ? { funder: { "@type": "Organization", name: project.client } }
      : {}),
    ...(project.location || project.region
      ? {
          locationCreated: {
            "@type": "Place",
            name: project.location || project.region,
            address: {
              "@type": "PostalAddress",
              ...(project.location
                ? { addressLocality: project.location }
                : {}),
              ...(project.region ? { addressRegion: project.region } : {}),
              addressCountry: "CL",
            },
          },
        }
      : {}),
  };
}

export interface ArticleJsonLdInput {
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  image?: string;
}

/** schema.org `Article` for a news post published by EMOJ. */
export function articleJsonLd(
  article: ArticleJsonLdInput,
  site: URL | undefined = DEFAULT_SITE,
) {
  const base = site ?? DEFAULT_SITE;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    mainEntityOfPage: article.url,
    ...(article.category ? { articleSection: article.category } : {}),
    ...(article.image ? { image: [article.image] } : {}),
    author: organizationRef(base),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: new URL("/icon-512.png", base).href,
      },
    },
  };
}
