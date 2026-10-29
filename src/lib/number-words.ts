/**
 * Small counts spelled out in Spanish for the copy ("Siete especialidades",
 * "Seis etapas"), so the words follow the data instead of drifting from it.
 * Only 1–12 are spelled; anything else stays in digits.
 */
const WORDS = [
  "",
  "una",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
] as const;

export interface NumberWordOptions {
  /** "una" (default, for feminine nouns) or "uno". */
  gender?: "feminine" | "masculine";
  /** Capitalize the first letter (start of a sentence). */
  capitalize?: boolean;
}

export function spanishNumberWord(
  value: number,
  { gender = "feminine", capitalize = false }: NumberWordOptions = {},
): string {
  const spelled = Number.isInteger(value) ? WORDS[value] : undefined;
  if (!spelled) return String(value);
  const word = value === 1 && gender === "masculine" ? "uno" : spelled;
  return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}
