import type { CLIENTS } from "./site";

/**
 * Logo file per reference client (public/logos/clientes/<file>.svg, the
 * brand's own artwork). Its aspect ratio and display height are set by the
 * matching `.client-logo--<file>` class (src/styles/global.css). A client
 * without a file shows its name as a wordmark.
 */
export const CLIENT_LOGOS: Partial<Record<(typeof CLIENTS)[number], string>> = {
  ESVAL: "esval",
  "Aguas del Valle": "aguas-del-valle",
  SAAM: "saam",
  "AES Andes": "aes-andes",
  CODELCO: "codelco",
};
