/**
 * Roles in the admin panel and the helpers of the Usuarios section. Admins
 * see everything; editors manage content only, so contact messages (personal
 * data) and user management are hidden from them. The API enforces the same
 * rule; the panel just avoids showing what an editor cannot open.
 */
import type { ApiNetworkError, ApiProblem } from "../api/client";
import type { ManagedUser, Role, UserStatus } from "./api";
import { problemMessage } from "./errors";
import { tooLong } from "./form-errors";
import { ADMIN_NAV, type AdminNavItem } from "./nav";
import type { ShellPage } from "./router";
import { subjectEmailError } from "./privacy-requests";

export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  admin: "Administrador",
  editor: "Editor",
};

export const STATUS_LABEL: Readonly<Record<UserStatus, string>> = {
  active: "Activo",
  invited: "Invitación pendiente",
  disabled: "Sin acceso",
};

/** What each role can do, shown next to the role picker. */
export const ROLE_HINT: Readonly<Record<Role, string>> = {
  admin: "Todo el panel, incluidos mensajes y usuarios.",
  editor: "Portada, proyectos, noticias y medios.",
};

const ADMIN_PAGES: ReadonlySet<ShellPage> = new Set(["messages", "users"]);

/** Sidebar sections the role may open. */
export function navFor(role: Role): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => role === "admin" || !item.adminOnly);
}

/** Whether the role may open a panel page. */
export function canOpen(page: ShellPage, role: Role): boolean {
  return role === "admin" || !ADMIN_PAGES.has(page);
}

const chileDate = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** "12-10-2026", or "Nunca" for someone who never signed in. */
export function lastAccessLabel(iso: string | null | undefined): string {
  return iso ? chileDate.format(new Date(iso)) : "Nunca";
}

export type StatusFilter = "all" | UserStatus;

/** People per status, for the tabs of the Usuarios page. */
export function statusCounts(
  users: readonly Pick<ManagedUser, "status">[],
): Record<StatusFilter, number> {
  const counts = { all: users.length, active: 0, invited: 0, disabled: 0 };
  for (const u of users) counts[u.status] += 1;
  return counts;
}

/** People per role among those with access (active or invited). */
export function roleCounts(
  users: readonly Pick<ManagedUser, "role" | "status">[],
): Record<Role, number> {
  const counts = { admin: 0, editor: 0 };
  for (const u of users) if (u.status !== "disabled") counts[u.role] += 1;
  return counts;
}

export function usersWithStatus<T extends Pick<ManagedUser, "status">>(
  users: readonly T[],
  filter: StatusFilter,
): T[] {
  return filter === "all"
    ? [...users]
    : users.filter((u) => u.status === filter);
}

/** Same limit as the API. */
const MAX_NAME = 120;

export interface InviteFields {
  name: string;
  email: string;
}

/** Spanish errors for the invitation form; empty when it can be sent. */
export function inviteErrors(
  input: InviteFields,
): Partial<Record<keyof InviteFields, string>> {
  const errors: Partial<Record<keyof InviteFields, string>> = {};
  const name = input.name.trim();
  if (name === "") errors.name = "Escribe el nombre de la persona.";
  else if ([...name].length > MAX_NAME) errors.name = tooLong(MAX_NAME);
  const email = subjectEmailError(input.email);
  if (email) errors.email = email;
  return errors;
}

/** Changes an admin can make on a row of the users table. */
export type UserAction = "invite" | "role" | "resend" | "disable" | "enable";

/** Actions offered on a user's row; none on your own. */
export function userActions(user: ManagedUser, myId: string): UserAction[] {
  if (user.id === myId) return [];
  switch (user.status) {
    case "disabled":
      return ["enable"];
    case "invited":
      return ["role", "resend", "disable"];
    default:
      return ["role", "disable"];
  }
}

const LAST_ADMIN =
  "Debe quedar al menos un administrador activo. Nombra otro administrador antes de hacer este cambio.";

const CONFLICT: Readonly<Record<UserAction, string>> = {
  invite: "Ya existe un usuario con ese correo.",
  role: LAST_ADMIN,
  disable: LAST_ADMIN,
  resend: "Esta persona ya creó su contraseña; no hay invitación pendiente.",
  enable: "No puedes cambiar tu propio acceso.",
};

/** Spanish message for a failed change in the Usuarios section. */
export function userActionMessage(
  action: UserAction,
  failure: ApiProblem | ApiNetworkError,
): string {
  if (failure.kind === "problem") {
    if (failure.status === 409) return CONFLICT[action];
    if (
      failure.status === 403 &&
      /administrators/i.test(failure.problem.detail ?? "")
    ) {
      return "Solo un administrador puede gestionar usuarios.";
    }
  }
  return problemMessage(failure);
}

/** Whether a password link is an invitation (`&invitacion=1`). */
export function isInvitation(search: string): boolean {
  return new URLSearchParams(search).get("invitacion") === "1";
}

/** Error for the password screen; an invitation asks an admin for a new one. */
export function resetMessage(
  failure: ApiProblem | ApiNetworkError,
  invitation: boolean,
): string {
  if (invitation && failure.kind === "problem" && failure.status === 400) {
    return "La invitación no es válida o ya venció. Pide a un administrador que te la reenvíe.";
  }
  return problemMessage(failure, "reset");
}
