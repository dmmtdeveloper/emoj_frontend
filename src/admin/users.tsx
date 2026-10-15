/**
 * Usuarios (admins only): who can enter the panel, with which role, and
 * invitations. Inviting creates the user without a password and emails them
 * a 7-day link to create one. Nobody changes their own role or access here,
 * and the API keeps at least one active admin.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  MailPlus,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCog,
  UserPlus,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import type { ManagedUser, Role, UserStatus } from "../lib/admin/api";
import { fieldErrors } from "../lib/admin/form-errors";
import { relativeTime } from "../lib/admin/dashboard";
import { initials } from "../lib/admin/messages";
import {
  inviteErrors,
  lastAccessLabel,
  ROLE_HINT,
  ROLE_LABEL,
  roleCounts,
  STATUS_LABEL,
  statusCounts,
  userActionMessage,
  userActions,
  usersWithStatus,
  type InviteFields,
  type StatusFilter,
  type UserAction,
} from "../lib/admin/users";
import { adminApi } from "./api";
import { ErrorNotice, formatDateTime, unwrap } from "./common";
import { useUser } from "./session";
import { ListSkeleton } from "./skeletons";
import { Button, Card, cx, Dialog, Field, Notice } from "./ui";

const ROLES: readonly Role[] = ["admin", "editor"];
const iconProps = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;
const ROLE_ICON: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  editor: PenLine,
};

function StatusPill({ status }: { status: UserStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm leading-5 font-semibold whitespace-nowrap",
        status === "active" && "bg-accent text-on-accent",
        status === "invited" && "bg-surface-sunken text-ink",
        status === "disabled" && "border border-border-strong text-ink-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "size-1.5 rounded-full",
          status === "active" && "bg-on-accent",
          status === "invited" && "bg-brand",
          status === "disabled" && "bg-ink-muted",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

function RoleLabel({ role }: { role: Role }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className="inline-flex items-center gap-1.5 text-base text-ink">
      <Icon {...iconProps} size={16} className="text-ink-muted" />
      {ROLE_LABEL[role]}
    </span>
  );
}

function RoleChoice({
  value,
  onChange,
}: {
  value: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm leading-5 font-semibold text-ink">
        Rol
      </legend>
      {ROLES.map((role) => (
        <label
          key={role}
          className={cx(
            "grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-md border px-3.5 py-3",
            value === role
              ? "border-brand bg-surface-sunken"
              : "border-border-strong",
          )}
        >
          <input
            type="radio"
            name="role"
            value={role}
            checked={value === role}
            onChange={() => onChange(role)}
            className="row-span-2 mt-1 accent-brand"
          />
          <span className="font-semibold text-ink">{ROLE_LABEL[role]}</span>
          <span className="text-sm text-ink-muted">{ROLE_HINT[role]}</span>
        </label>
      ))}
    </fieldset>
  );
}

function InviteDialog({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (user: ManagedUser) => void;
}) {
  const [fields, setFields] = useState<InviteFields>({ name: "", email: "" });
  const [role, setRole] = useState<Role>("editor");
  const [errors, setErrors] = useState<
    Partial<Record<keyof InviteFields, string>>
  >({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = inviteErrors(fields);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const result = await adminApi.inviteUser({
      name: fields.name.trim(),
      email: fields.email.trim(),
      role,
    });
    setBusy(false);
    if (result.ok) {
      onInvited(result.data);
      return;
    }
    if (result.kind === "problem" && result.status === 409) {
      setErrors({ email: userActionMessage("invite", result) });
      return;
    }
    if (
      result.kind === "problem" &&
      result.status === 422 &&
      result.problem.errors
    ) {
      setErrors(
        fieldErrors(422, result.problem.errors, {
          fields: { name: "name", email: "email" },
          slugTaken: "",
          fallbacks: {
            email: "Revisa el correo: debe tener la forma nombre@dominio.cl.",
          },
        }).fields,
      );
      return;
    }
    setFailure(userActionMessage("invite", result));
  }

  return (
    <Dialog
      title="Invitar usuario"
      description="Le enviaremos un correo para que cree su contraseña. El enlace vale 7 días."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-5"
        noValidate
      >
        {failure && <Notice tone="error">{failure}</Notice>}
        <Field
          label="Nombre"
          value={fields.name}
          maxLength={120}
          autoComplete="off"
          error={errors.name}
          onChange={(event) =>
            setFields({ ...fields, name: event.target.value })
          }
        />
        <Field
          label="Correo"
          type="email"
          value={fields.email}
          autoComplete="off"
          error={errors.email}
          hint="Será su usuario para entrar al panel."
          onChange={(event) =>
            setFields({ ...fields, email: event.target.value })
          }
        />
        <RoleChoice value={role} onChange={setRole} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            <MailPlus size={18} strokeWidth={1.75} aria-hidden="true" />
            {busy ? "Enviando…" : "Enviar invitación"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RoleDialog({
  user,
  busy,
  error,
  onSave,
  onClose,
}: {
  user: ManagedUser;
  busy: boolean;
  error: string | null;
  onSave: (role: Role) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState<Role>(user.role);
  return (
    <Dialog
      title={`Rol de ${user.name || user.email}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={busy || role === user.role}
            onClick={() => onSave(role)}
          >
            {busy ? "Guardando…" : "Guardar rol"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <RoleChoice value={role} onChange={setRole} />
      </div>
    </Dialog>
  );
}

function DisableDialog({
  user,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  user: ManagedUser;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const invited = user.status === "invited";
  return (
    <Dialog
      title={`¿Quitar el acceso a ${user.name || user.email}?`}
      description={
        invited
          ? "Su invitación dejará de funcionar. Puedes devolverle el acceso cuando quieras."
          : "Se cerrarán sus sesiones abiertas y no podrá volver a entrar. Puedes devolverle el acceso cuando quieras."
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? "Quitando…" : "Quitar acceso"}
          </Button>
        </>
      }
    >
      {error && <Notice tone="error">{error}</Notice>}
    </Dialog>
  );
}

type Open = { action: "role" | "disable"; user: ManagedUser } | null;

/** Columns of the users table on wide screens (rows stack below that). */
const WIDE_GRID =
  "xl:grid xl:grid-cols-[minmax(14rem,1fr)_8.5rem_10.5rem_7rem_21rem] xl:items-center xl:gap-x-4";

const actionClass = "min-h-9 gap-1.5 px-2.5 text-sm whitespace-nowrap";

function UserRow({
  user,
  isMe,
  busy,
  onAction,
}: {
  user: ManagedUser;
  isMe: boolean;
  busy: boolean;
  onAction: (action: UserAction) => void;
}) {
  const actions = userActions(user, isMe ? user.id : "");
  const who = user.name || user.email;
  return (
    <li
      className={cx(
        "flex flex-col gap-3 px-5 py-4 md:px-6",
        user.status === "disabled" && "bg-surface-sunken/40",
        WIDE_GRID,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cx(
            "grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold",
            isMe
              ? "bg-surface-inverse text-ink-inverse"
              : "bg-surface-sunken text-ink",
            user.status === "disabled" && "opacity-60",
          )}
        >
          {initials(user.name || user.email)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <span className="truncate">{user.name || "Sin nombre"}</span>
            {isMe && (
              <span className="shrink-0 rounded-full border border-border-strong px-2 text-xs leading-5 font-medium text-ink-muted">
                Tú
              </span>
            )}
          </p>
          <p className="truncate text-sm text-ink-muted" title={user.email}>
            {user.email}
          </p>
        </div>
      </div>
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:pl-13 xl:contents">
        <div>
          <dt className="sr-only">Rol</dt>
          <dd>
            <RoleLabel role={user.role} />
          </dd>
        </div>
        <div>
          <dt className="sr-only">Estado</dt>
          <dd>
            <StatusPill status={user.status} />
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted xl:sr-only">Último acceso:</dt>
          <dd className="text-ink-muted">
            {user.lastLoginAt ? (
              <time
                dateTime={user.lastLoginAt}
                title={formatDateTime(user.lastLoginAt)}
              >
                {relativeTime(user.lastLoginAt)}
              </time>
            ) : (
              lastAccessLabel(null)
            )}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-1.5 sm:pl-13 xl:flex-nowrap xl:justify-end xl:pl-0">
        {actions.includes("role") && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onAction("role")}
            aria-label={`Cambiar el rol de ${who}`}
            className={actionClass}
          >
            <UserCog {...iconProps} size={16} />
            Cambiar rol
          </Button>
        )}
        {actions.includes("resend") && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onAction("resend")}
            aria-label={`Reenviar la invitación a ${who}`}
            className={actionClass}
          >
            <Send {...iconProps} size={16} />
            Reenviar
          </Button>
        )}
        {actions.includes("disable") && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onAction("disable")}
            aria-label={`Quitar el acceso a ${who}`}
            title="Quitar acceso"
            className={actionClass}
          >
            <UserX {...iconProps} size={16} />
            {/* Icon only in the table, where three actions share 21rem. */}
            <span className="xl:sr-only">Quitar acceso</span>
          </Button>
        )}
        {actions.includes("enable") && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onAction("enable")}
            aria-label={`Devolver el acceso a ${who}`}
            className={actionClass}
          >
            <RotateCcw {...iconProps} size={16} />
            Devolver acceso
          </Button>
        )}
      </div>
    </li>
  );
}

/** What each role can do, with how many people have it. */
function RoleCard({ role, count }: { role: Role; count: number }) {
  const Icon = ROLE_ICON[role];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink">
        <Icon {...iconProps} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex items-baseline gap-2 font-semibold text-ink">
          {ROLE_LABEL[role]}
          <span className="text-sm font-medium text-ink-muted">
            <span className="font-data tabular-nums">{count}</span>{" "}
            {count === 1 ? "persona" : "personas"}
          </span>
        </p>
        <p className="text-sm text-ink-muted">{ROLE_HINT[role]}</p>
      </div>
    </div>
  );
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "invited", label: "Invitaciones" },
  { value: "disabled", label: "Sin acceso" },
];

export function UsersPage() {
  const me = useUser();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["users"],
    queryFn: async () => unwrap(await adminApi.listUsers()),
  });
  const [inviting, setInviting] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [open, setOpen] = useState<Open>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  function replace(updated: ManagedUser) {
    queryClient.setQueryData<{ items: ManagedUser[] }>(["users"], (data) =>
      data
        ? {
            items: data.items.map((u) => (u.id === updated.id ? updated : u)),
          }
        : data,
    );
  }

  async function run(action: UserAction, user: ManagedUser, role?: Role) {
    setBusyId(user.id);
    setDialogError(null);
    setNotice(null);
    const who = user.name || user.email;
    const result =
      action === "role" && role
        ? await adminApi.updateUser(user.id, { role })
        : action === "disable"
          ? await adminApi.disableUser(user.id)
          : action === "enable"
            ? await adminApi.enableUser(user.id)
            : await adminApi.resendInvitation(user.id);
    setBusyId(null);
    if (!result.ok) {
      const message = userActionMessage(action, result);
      if (open) setDialogError(message);
      else setNotice({ tone: "error", text: message });
      return;
    }
    replace(result.data);
    setOpen(null);
    setNotice({
      tone: "success",
      text:
        action === "role"
          ? `${who} ahora es ${ROLE_LABEL[result.data.role].toLowerCase()}.`
          : action === "disable"
            ? `${who} ya no tiene acceso al panel.`
            : action === "enable"
              ? `${who} tiene acceso de nuevo.`
              : `Reenviamos la invitación a ${user.email}. El enlace anterior dejó de funcionar.`,
    });
  }

  function onAction(user: ManagedUser, action: UserAction) {
    setDialogError(null);
    if (action === "role" || action === "disable") {
      setOpen({ action, user });
      return;
    }
    void run(action, user);
  }

  const users = query.data?.items ?? [];
  const counts = statusCounts(users);
  const roles = roleCounts(users);
  const shown = usersWithStatus(users, filter);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <fieldset className="min-w-0">
          <legend className="sr-only">Mostrar</legend>
          <div className="inline-flex min-h-11 max-w-full items-stretch gap-1 overflow-x-auto rounded-full border border-border bg-surface-raised p-1">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <label
                  key={f.value}
                  className={cx(
                    "flex cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors has-focus-visible:outline-2 has-focus-visible:outline-focus-ring",
                    active
                      ? "bg-surface-inverse text-ink-inverse"
                      : "text-ink hover:bg-surface-sunken",
                  )}
                >
                  <input
                    type="radio"
                    name="filtro-usuarios"
                    value={f.value}
                    checked={active}
                    onChange={() => setFilter(f.value)}
                    className="sr-only"
                  />
                  {f.label}
                  {query.data && (
                    <span
                      className={cx(
                        "font-data text-xs tabular-nums",
                        active ? "text-ink-inverse" : "text-ink-muted",
                      )}
                    >
                      {counts[f.value]}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button
          onClick={() => {
            setNotice(null);
            setInviting(true);
          }}
        >
          <UserPlus {...iconProps} />
          Invitar usuario
        </Button>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {query.error && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}

      {query.data && (
        <section
          aria-label="Roles del panel"
          className="grid gap-4 md:grid-cols-2"
        >
          {ROLES.map((role) => (
            <RoleCard key={role} role={role} count={roles[role]} />
          ))}
        </section>
      )}

      <Card className="overflow-hidden p-0! md:p-0!">
        {query.isPending ? (
          <div className="px-5 md:px-6">
            <ListSkeleton label="Cargando usuarios…" rows={3} />
          </div>
        ) : query.data ? (
          <>
            <h2 className="sr-only">Usuarios del panel</h2>
            <div
              aria-hidden="true"
              className={cx(
                "hidden border-b border-border px-6 py-2.5 text-xs font-medium tracking-[0.06em] text-ink-muted uppercase",
                WIDE_GRID,
              )}
            >
              <span>Persona</span>
              <span>Rol</span>
              <span>Estado</span>
              <span>Último acceso</span>
              <span />
            </div>
            {shown.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-6 py-12 text-ink-muted">
                <KeyRound {...iconProps} />
                {filter === "invited"
                  ? "No hay invitaciones pendientes."
                  : filter === "disabled"
                    ? "Nadie está sin acceso."
                    : "No hay usuarios con ese estado."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {shown.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isMe={user.id === me.id}
                    busy={busyId === user.id}
                    onAction={(action) => onAction(user, action)}
                  />
                ))}
              </ul>
            )}
          </>
        ) : null}
      </Card>

      {inviting && (
        <InviteDialog
          onClose={() => setInviting(false)}
          onInvited={(user) => {
            setInviting(false);
            queryClient.setQueryData<{ items: ManagedUser[] }>(
              ["users"],
              (data) =>
                data
                  ? {
                      items: [...data.items, user].sort((a, b) =>
                        a.email.localeCompare(b.email),
                      ),
                    }
                  : data,
            );
            setNotice({
              tone: "success",
              text: `Enviamos la invitación a ${user.email}. Tiene 7 días para crear su contraseña.`,
            });
          }}
        />
      )}
      {open?.action === "role" && (
        <RoleDialog
          user={open.user}
          busy={busyId === open.user.id}
          error={dialogError}
          onSave={(role) => void run("role", open.user, role)}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.action === "disable" && (
        <DisableDialog
          user={open.user}
          busy={busyId === open.user.id}
          error={dialogError}
          onConfirm={() => void run("disable", open.user)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

/** Shown to an editor who opens an admin-only address directly. */
export function NoAccessPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg leading-6 font-semibold text-ink">
          Esta sección es solo para administradores
        </h2>
        <p className="text-ink-muted">
          Tu rol es editor: puedes gestionar la portada, los proyectos, las
          noticias y los medios. Si necesitas entrar aquí, pídeselo a un
          administrador de EMOJ.
        </p>
      </Card>
    </div>
  );
}
