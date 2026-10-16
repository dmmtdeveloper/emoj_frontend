/**
 * The six stages of an EMOJ project, told on the home ("Cómo trabajamos",
 * src/components/home/scenes/ObraScene.astro). Each one has a short text
 * and two facts (label and value). Real practice, no invented figures.
 */
export interface WorkStage {
  title: string;
  text: string;
  facts: readonly (readonly [string, string])[];
}

export const WORK_STAGES: readonly WorkStage[] = [
  {
    title: "Conversamos",
    text: "Escuchamos qué necesitas, revisamos tus antecedentes y definimos contigo el alcance, los plazos y los entregables.",
    facts: [
      ["Entregamos", "Propuesta técnica y económica"],
      ["Contigo", "Un coordinador desde el día uno"],
    ],
  },
  {
    title: "Vamos a terreno",
    text: "Visitamos el lugar, levantamos la topografía y tomamos las muestras de suelo que el diseño va a necesitar.",
    facts: [
      ["En terreno", "Topografía · calicatas · catastro"],
      ["Resultado", "Datos reales, no supuestos"],
    ],
  },
  {
    title: "Estudiamos",
    text: "Hacemos los estudios base de hidráulica, tránsito y mecánica de suelos para diseñar sobre lo que el terreno nos dice.",
    facts: [
      ["Estudios", "Hidráulico · tránsito · geotecnia"],
      ["Entregamos", "Informes y recomendaciones"],
    ],
  },
  {
    title: "Diseñamos",
    text: "Ingenieros y proyectistas desarrollan el proyecto completo, con cada especialidad coordinada desde el primer plano.",
    facts: [
      ["Entregamos", "Planos · memorias de cálculo · presupuesto"],
      ["Normativa", "NCh 691 · NCh 1105 · NCh 433"],
    ],
  },
  {
    title: "Aprobamos",
    text: "Ingresamos el proyecto a los organismos que corresponda y respondemos sus observaciones hasta que queda aprobado.",
    facts: [
      ["Ante", "SERVIU · MOP · DOH · sanitarias · DOM"],
      ["Resultado", "Proyecto listo para licitar"],
    ],
  },
  {
    title: "Acompañamos la obra",
    text: "Asesoramos durante la construcción para que lo que se construye sea lo que se diseñó.",
    facts: [
      ["En obra", "Asesoría técnica e inspección"],
      ["Ya son obra", "ESVAL · Aguas del Valle · SAAM"],
    ],
  },
];
