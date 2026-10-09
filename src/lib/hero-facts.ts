/**
 * The data strip at the foot of the home hero (Hero.astro): four short
 * facts set in the data typeface (`font-data`, Space Grotesk).
 */
export interface HeroFact {
  label: string;
  value: string;
}

/** @param serviceCount how many services the site lists (getServices). */
export function heroFacts(serviceCount: number): HeroFact[] {
  return [
    { label: "Experiencia", value: "30+ años" },
    { label: "Especialidades", value: `${serviceCount} coordinadas` },
    { label: "Base", value: "Quilpué, Valparaíso" },
    { label: "Zona", value: "Valparaíso y Coquimbo" },
  ];
}
