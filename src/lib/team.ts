/**
 * EMOJ team, as published on emoj.cl/nosotros (snapshot of 2026-10-02).
 * Names were concatenated on the old site ("SebastiánBurgos"); they are
 * written with a space here. `photo` is a file name in src/assets/team
 * (optimized with Pillow: max 800px, JPEG quality 82); people without a
 * real photo on the old site have none and get an initials avatar.
 */

export interface TeamMember {
  name: string;
  role: string;
  /** Degree and institution, when the old site showed it. */
  education?: string;
  photo?: string;
}

export interface Department {
  name: string;
  members: TeamMember[];
}

export const TEAM: Department[] = [
  {
    name: "Gerencia",
    members: [
      {
        name: "Eduardo Olguín",
        role: "Gerente General",
        education: "Ingeniero Civil, UTFSM",
        photo: "eduardo-olguin",
      },
    ],
  },
  {
    name: "Departamento de Ingeniería",
    members: [
      {
        name: "Sebastián Burgos",
        role: "Jefe de Ingeniería",
        education: "Ingeniero Civil, UTFSM",
        photo: "sebastian-burgos",
      },
      {
        name: "Cristóbal Cea",
        role: "Ingeniero Civil",
        education: "Ingeniero Civil, UTFSM",
      },
      {
        name: "José Rojas",
        role: "Ingeniero Civil",
        education: "Ingeniero Civil, UTFSM",
        photo: "jose-rojas",
      },
      {
        name: "Maximiliano Troncoso",
        role: "Ingeniero Civil",
        education: "Ingeniero Civil, UTFSM",
        photo: "maximiliano-troncoso",
      },
    ],
  },
  {
    name: "Departamento de Dibujo",
    members: [
      {
        name: "Patricio Astorga",
        role: "Dibujante Proyectista",
        education: "Dibujo técnico industrial, INACAP",
      },
      {
        name: "Diego Abuyeres",
        role: "Dibujante Proyectista",
        education: "Dibujante técnico en proyecto de ingeniería, UTFSM",
      },
      {
        name: "Rocío Jerez",
        role: "Dibujante Proyectista",
        education: "Dibujante técnico en proyecto de ingeniería, UTFSM",
        photo: "rocio-jerez",
      },
      {
        name: "Maxell Cayupe",
        role: "Dibujante Proyectista",
        education: "Dibujante técnico en proyecto de ingeniería, UTFSM",
      },
    ],
  },
  {
    name: "Departamento de Administración",
    members: [
      {
        name: "Mauricio Meza",
        role: "Asistente de Gerencia",
        photo: "mauricio-meza",
      },
      {
        name: "Eliana González",
        role: "Coordinadora de Proyectos",
        photo: "eliana-gonzalez",
      },
      {
        name: "Tamara Moraga",
        role: "Secretaria",
        photo: "tamara-moraga",
      },
      {
        name: "Martín Ahumada",
        role: "Administrador Comercial",
        education: "Ingeniero Comercial, PUCV",
        photo: "martin-ahumada",
      },
    ],
  },
];

/** Company description from emoj.cl/nosotros. */
export const ABOUT_INTRO =
  "EMOJ Consultora SpA es una empresa chilena con más de 30 años de experiencia en ingeniería civil, especializada en proyectos estructurales, arquitectónicos, hidráulicos y sanitarios.";

/** Positioning facts from emoj.cl/nosotros (regions IV and V). */
export const ABOUT_POSITIONING = [
  "Trabaja con clientes como ESVAL, Aguas del Valle, SAAM y AES Gener, liderando proyectos en las regiones de Coquimbo y Valparaíso.",
  "Se destaca por su experiencia en proyectos complejos, el cumplimiento de plazos, la calidad y una cultura colaborativa. Se ha consolidado como un referente del sector gracias a su enfoque personalizado y a relaciones de confianza.",
] as const;

export const VISION =
  "Ser una empresa líder en el rubro, aportando verdaderamente al engrandecimiento de nuestro país.";

/**
 * A few faces for a small avatar stack: the first `limit` people with a
 * real photo, in team order, plus how many other people are on the team.
 */
export function teamFaces(
  team: readonly Department[],
  limit: number,
): { faces: TeamMember[]; others: number } {
  const everyone = team.flatMap((d) => d.members);
  const faces = everyone.filter((m) => m.photo).slice(0, limit);
  return { faces, others: everyone.length - faces.length };
}
