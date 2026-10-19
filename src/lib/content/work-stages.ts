/**
 * The six stages of an EMOJ project, told on the home ("Cómo trabajamos",
 * src/components/home/chapters/WorkChapter.astro): its name and one line
 * on what we do there. Real practice, no invented figures.
 */
export interface WorkStage {
  name: string;
  line: string;
}

export const WORK_STAGES: readonly WorkStage[] = [
  {
    name: "Conversación",
    line: "Entendemos tu proyecto y definimos contigo el alcance, los plazos y los entregables.",
  },
  {
    name: "Terreno",
    line: "Visitamos el lugar, levantamos la topografía y tomamos las muestras de suelo.",
  },
  {
    name: "Estudios",
    line: "Hacemos los estudios de hidráulica, tránsito y mecánica de suelos que el diseño necesita.",
  },
  {
    name: "Diseño",
    line: "Desarrollamos planos y memorias con todas las especialidades coordinadas.",
  },
  {
    name: "Aprobación",
    line: "Ingresamos el proyecto a los organismos y respondemos sus observaciones hasta aprobarlo.",
  },
  {
    name: "Obra",
    line: "Te acompañamos en la construcción para que se construya lo que se diseñó.",
  },
];
