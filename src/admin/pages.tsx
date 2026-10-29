/**
 * Panel pages inside the shell: Resumen (dashboard), Cuenta, and the
 * sections still under construction.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FileText, FolderKanban, Pencil, Plus } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { problemMessage } from "../lib/admin/errors";
import { LOGIN_PATH } from "../lib/admin/redirect";
import { ROLE_HINT, ROLE_LABEL } from "../lib/admin/users";
import { adminApi } from "./api";
import { ErrorNotice, unwrap } from "./common";
import { useUser } from "./session";
import { DashboardSkeleton } from "./skeletons";
import { Button, ButtonLink, Card, Field, Notice } from "./ui";

/* ------------------------------------------------------------------ */
/* Resumen                                                             */
/* ------------------------------------------------------------------ */

function useCounts() {
  return useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [projectsDraft, projectsPublished, newsDraft, newsPublished] =
        await Promise.all([
          adminApi.listProjects({ status: "draft", pageSize: 1 }),
          adminApi.listProjects({ status: "published", pageSize: 1 }),
          adminApi.listNews({ status: "draft", pageSize: 1 }),
          adminApi.listNews({ status: "published", pageSize: 1 }),
        ]);
      return {
        projects: {
          draft: unwrap(projectsDraft).total,
          published: unwrap(projectsPublished).total,
        },
        news: {
          draft: unwrap(newsDraft).total,
          published: unwrap(newsPublished).total,
        },
      };
    },
  });
}

function StatCard({
  title,
  href,
  newHref,
  newLabel,
  icon: Icon,
  published,
  draft,
}: {
  title: string;
  href: string;
  /** "Nuevo …" quick action, once that editor exists. */
  newHref?: string;
  newLabel?: string;
  icon: typeof FolderKanban;
  published: number;
  draft: number;
}) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-surface-sunken text-ink">
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="text-lg leading-6 font-semibold text-ink">{title}</h2>
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-ink-muted">Publicados</dt>
          <dd className="text-[32px] leading-10 font-semibold text-ink tabular-nums">
            {published}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">Borradores</dt>
          <dd className="text-[32px] leading-10 font-semibold text-ink tabular-nums">
            {draft}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2">
        {newHref && (
          <ButtonLink href={newHref}>
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            {newLabel}
          </ButtonLink>
        )}
        <ButtonLink href={href} variant="secondary">
          Ver {title.toLowerCase()}
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </ButtonLink>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const user = useUser();
  const counts = useCounts();
  const firstName = (user.name || "").split(/\s+/)[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <p className="text-lg leading-7 text-ink">
        Hola{firstName ? `, ${firstName}` : ""}. Esto es lo que hay en el sitio
        hoy.
      </p>

      {counts.error && (
        <ErrorNotice error={counts.error} retry={() => void counts.refetch()} />
      )}

      {counts.isPending ? (
        <DashboardSkeleton />
      ) : counts.data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <StatCard
            title="Proyectos"
            href="/admin/proyectos"
            newHref="/admin/proyectos/nuevo"
            newLabel="Nuevo proyecto"
            icon={FolderKanban}
            published={counts.data.projects.published}
            draft={counts.data.projects.draft}
          />
          <StatCard
            title="Noticias"
            href="/admin/noticias"
            newHref="/admin/noticias/nueva"
            newLabel="Nueva noticia"
            icon={FileText}
            published={counts.data.news.published}
            draft={counts.data.news.draft}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cuenta                                                              */
/* ------------------------------------------------------------------ */

function NameForm({ name, onDone }: { name: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed === "") {
      setError("Escribe tu nombre.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await adminApi.renameMe(trimmed);
    setBusy(false);
    if (!result.ok) {
      setError(problemMessage(result));
      return;
    }
    queryClient.setQueryData(["session"], result);
    onDone();
  }

  return (
    <form
      onSubmit={(event) => void save(event)}
      className="mt-4 flex flex-col gap-4"
    >
      <Field
        label="Nombre"
        value={value}
        maxLength={120}
        autoComplete="name"
        error={error ?? undefined}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar nombre"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function AccountPage() {
  const user = useUser();
  const [editingName, setEditingName] = useState(false);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "busy" }
    | { kind: "sent" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [endingAll, setEndingAll] = useState(false);

  async function sendReset() {
    setState({ kind: "busy" });
    const result = await adminApi.forgotPassword(user.email);
    setState(
      result.ok
        ? { kind: "sent" }
        : { kind: "error", message: problemMessage(result, "forgot") },
    );
  }

  async function endAllSessions() {
    setEndingAll(true);
    await adminApi.logoutAll();
    window.location.assign(LOGIN_PATH);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg leading-6 font-semibold text-ink">
            Tus datos
          </h2>
          {!editingName && (
            <Button variant="ghost" onClick={() => setEditingName(true)}>
              <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
              Cambiar nombre
            </Button>
          )}
        </div>
        {editingName ? (
          <NameForm name={user.name} onDone={() => setEditingName(false)} />
        ) : null}
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {!editingName && (
            <div>
              <dt className="text-sm text-ink-muted">Nombre</dt>
              <dd className="text-ink">{user.name || "Sin nombre"}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-ink-muted">Correo</dt>
            <dd className="break-all text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Rol</dt>
            <dd className="text-ink">
              {ROLE_LABEL[user.role]}
              <span className="block text-sm text-ink-muted">
                {ROLE_HINT[user.role]}
              </span>
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg leading-6 font-semibold text-ink">Contraseña</h2>
        <p className="max-w-[60ch] text-ink-muted">
          Para cambiarla te enviamos un enlace a tu correo. Así nadie puede
          cambiarla solo con tener tu computador abierto.
        </p>
        {state.kind === "sent" && (
          <Notice tone="success">
            Te enviamos el enlace a {user.email}. Vence en 30 minutos.
          </Notice>
        )}
        {state.kind === "error" && (
          <Notice tone="error">{state.message}</Notice>
        )}
        <div>
          <Button
            variant="secondary"
            disabled={state.kind === "busy"}
            onClick={() => void sendReset()}
          >
            {state.kind === "busy" ? "Enviando…" : "Enviarme el enlace"}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg leading-6 font-semibold text-ink">Sesiones</h2>
        <p className="max-w-[60ch] text-ink-muted">
          Si entraste desde un computador que no es tuyo o perdiste tu celular,
          cierra la sesión en todos los dispositivos.
        </p>
        <div>
          <Button
            variant="secondary"
            disabled={endingAll}
            onClick={() => void endAllSessions()}
          >
            {endingAll
              ? "Cerrando…"
              : "Cerrar sesión en todos los dispositivos"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Secciones en construcción                                           */
/* ------------------------------------------------------------------ */

export function ComingSoonPage({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg leading-6 font-semibold text-ink">
          Esta sección llega en la próxima etapa
        </h2>
        <p className="text-ink-muted">
          Aquí vas a poder crear, editar y publicar {what}. Por ahora, el
          contenido del sitio se carga desde el equipo técnico.
        </p>
      </Card>
    </div>
  );
}
