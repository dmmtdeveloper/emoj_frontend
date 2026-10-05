/**
 * Plain-language Spanish messages for failed admin requests. The editor is
 * not technical: no status codes, no API jargon, always a next step.
 */
import type { ApiNetworkError, ApiProblem } from "../api/client";

/** Where the failure happened, to pick the right wording. */
export type ProblemContext = "login" | "forgot" | "reset" | "default";

function waitText(seconds: number | undefined): string {
  if (seconds === undefined) return "unos minutos";
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
}

export function problemMessage(
  failure: ApiProblem | ApiNetworkError,
  context: ProblemContext = "default",
): string {
  if (failure.kind === "network") {
    return "No pudimos conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.";
  }
  const { status } = failure;
  if (status === 429) {
    return `Demasiados intentos. Por seguridad, espera ${waitText(failure.retryAfter)} antes de volver a intentarlo.`;
  }
  if (status === 401) {
    return context === "login"
      ? "El correo o la contraseña no son correctos."
      : "Tu sesión terminó. Vuelve a iniciar sesión.";
  }
  if (status === 403) {
    return "No pudimos verificar tu sesión. Recarga la página e inténtalo de nuevo.";
  }
  if (context === "reset" && status === 400) {
    return "El enlace para cambiar la contraseña no es válido o ya venció. Pide uno nuevo.";
  }
  if (context === "reset" && status === 422) {
    return "La contraseña debe tener entre 12 y 128 caracteres y no puede contener tu correo.";
  }
  if (status === 404)
    return "No encontramos lo que buscas. Puede que ya no exista.";
  if (status >= 500) {
    return "Algo falló en el servidor. Inténtalo de nuevo en unos minutos.";
  }
  return "No pudimos completar la acción. Revisa los datos e inténtalo de nuevo.";
}
