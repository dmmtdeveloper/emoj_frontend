/**
 * Usuarios (admins only): who can enter the panel, with which role, and
 * invitations. Inviting creates the user without a password and emails them
 * a 7-day link to create one. Nobody changes their own role or access here,
 * and the API keeps at least one active admin.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, UserPlus } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import type { ManagedUser, Role, UserStatus } from "../lib/admin/api";
import { fieldErrors } from "../lib/admin/form-errors";
import {
  inviteErrors,
  lastAccessLabel,
  ROLE_HINT,
  ROLE_LABEL,
  STATUS_LABEL,
  userActionMessage,
  userActions,
  type InviteFields,
  type UserAction,
} from "../lib/admin/users";
import { adminApi } from "./api";
import { ErrorNotice, unwrap } from "./common";
import { useUser } from "./session";
import { MessagesSkeleton } from "./skeletons";
import { Button, Card, cx, Dialog, Field, Notice } from "./ui";

const ROLES: readonly Role[] = ["admin", "editor"];

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
      {STATUS_LABEL[status]}
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
  "min-[1360px]:grid min-[1360px]:grid-cols-[minmax(0,1fr)_7.5rem_11rem_6.5rem_23rem] min-[1360px]:items-center min-[1360px]:gap-x-4";

const actionClass = "px-3 text-sm whitespace-nowrap";

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
    <li className={cx("flex flex-col gap-3 py-4", WIDE_GRID)}>
      <div className="min-w-0">
        <p className="font-semibold text-ink">
          {user.name || "Sin nombre"}
          {isMe && (
            <span className="ml-2 text-sm font-medium text-ink-muted">
              (tú)
            </span>
          )}
        </p>
        <p className="text-sm break-all text-ink-muted">{user.email}</p>
      </div>
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm min-[1360px]:contents">
        <div>
          <dt className="sr-only">Rol</dt>
          <dd className="text-ink">{ROLE_LABEL[user.role]}</dd>
        </div>
        <div>
          <dt className="sr-only">Estado</dt>
          <dd>
            <StatusPill status={user.status} />
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted min-[1360px]:sr-only">
            Último acceso:
          </dt>
          <dd className="text-ink-muted">
            {user.lastLoginAt ? (
              <time dateTime={user.lastLoginAt}>
                {lastAccessLabel(user.lastLoginAt)}
              </time>
            ) : (
              lastAccessLabel(null)
            )}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2 min-[1360px]:flex-nowrap min-[1360px]:justify-end">
        {actions.includes("role") && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onAction("role")}
            aria-label={`Cambiar el rol de ${who}`}
            className={actionClass}
          >
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
            Reenviar
          </Button>
        )}
        {actions.includes("disable") && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onAction("disable")}
            aria-label={`Quitar el acceso a ${who}`}
            className={actionClass}
          >
            Quitar acceso
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
            Devolver acceso
          </Button>
        )}
      </div>
    </li>
  );
}

export function UsersPage() {
  const me = useUser();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["users"],
    queryFn: async () => unwrap(await adminApi.listUsers()),
  });
  const [inviting, setInviting] = useState(false);
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[60ch] text-ink-muted">
          Los administradores ven todo el panel, incluidos los mensajes del
          formulario y esta sección. Los editores gestionan la portada, los
          proyectos, las noticias y los medios.
        </p>
        <Button
          onClick={() => {
            setNotice(null);
            setInviting(true);
          }}
        >
          <UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />
          Invitar usuario
        </Button>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {query.error && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}

      <Card>
        {query.isPending ? (
          <MessagesSkeleton />
        ) : query.data ? (
          <>
            <h2 className="sr-only">Usuarios del panel</h2>
            <div
              aria-hidden="true"
              className={cx(
                "hidden border-b border-border pb-3 text-sm font-semibold text-ink-muted",
                WIDE_GRID,
              )}
            >
              <span>Persona</span>
              <span>Rol</span>
              <span>Estado</span>
              <span>Último acceso</span>
              <span />
            </div>
            <ul className="-my-4 divide-y divide-border min-[1360px]:my-0 min-[1360px]:-mb-4">
              {query.data.items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isMe={user.id === me.id}
                  busy={busyId === user.id}
                  onAction={(action) => onAction(user, action)}
                />
              ))}
            </ul>
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
