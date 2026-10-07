/**
 * Minimal page for a 503 (the API is down while rendering on demand). Plain
 * HTML with no inline script or style, so the CSP allows it.
 */
export function unavailablePage(): string {
  return [
    "<!doctype html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex">',
    "<title>Volvemos en un momento | EMOJ Consultora</title>",
    "</head>",
    "<body>",
    "<h1>Volvemos en un momento</h1>",
    "<p>No pudimos cargar esta página. Intenta de nuevo en unos minutos.</p>",
    '<p>Si necesitas escribirnos: <a href="mailto:coordinacion@emoj.cl">coordinacion@emoj.cl</a></p>',
    "</body>",
    "</html>",
  ].join("\n");
}
