/**
 * Panel pages inside the shell: Resumen (dashboard) and Cuenta.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  FileText,
  FolderKanban,
  KeyRound,
  LogOut,
  Mail,
  MonitorSmartphone,
  PenLine,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode, type SyntheticEvent } from "react";
import type { AdminNews, AdminProject } from "../lib/admin/api";
import { mergeRecent, relativeTime } from "../lib/admin/dashboard";
import { problemMessage } from "../lib/admin/errors";
import { LOGIN_PATH } from "../lib/admin/redirect";
import { initials, ROLE_HINT, ROLE_LABEL } from "../lib/admin/users";
import { adminApi } from "./api";
import { ErrorNotice, unwrap } from "./common";
import { useUser } from "./session";
import { DashboardSkeleton } from "./skeletons";
import { editNewsHref } from "./news";
import { editProjectHref } from "./projects";
import {
  Button,
  ButtonLink,
  Card,
  cx,
  FadeImage,
  Field,
  Notice,
  StatusBadge,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Resumen                                                             */
/* ------------------------------------------------------------------ */

/** Counts per status and the most recently edited projects and news. */
function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [
        projectsDraft,
        projectsPublished,
        newsDraft,
        newsPublished,
        recentProjects,
        recentNews,
      ] = await Promise.all([
        adminApi.listProjects({ status: "draft", pageSize: 1 }),
        adminApi.listProjects({ status: "published", pageSize: 1 }),
        adminApi.listNews({ status: "draft", pageSize: 1 }),
        adminApi.listNews({ status: "published", pageSize: 1 }),
        adminApi.listProjects({ pageSize: RECENT_LIMIT }),
        adminApi.listNews({ pageSize: RECENT_LIMIT }),
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
        recent: mergeRecent(
          unwrap(recentProjects).items,
          unwrap(recentNews).items,
          RECENT_LIMIT,
        ),
      };
    },
  });
}

const RECENT_LIMIT = 6;

const todayFormat = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Santiago",
});

const iconProps = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;

/** One figure of the summary strip; the whole tile links to its section. */
function Stat({
  label,
  value,
  href,
  icon: Icon,
  children,
}: {
  label: string;
  value: number;
  href: string;
  icon: typeof FolderKanban;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col gap-3 p-5 text-ink no-underline transition-colors hover:bg-surface-sunken hover:text-ink md:p-6"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <Icon {...iconProps} />
        {label}
        <ArrowRight
          {...iconProps}
          size={16}
          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </span>
      <span className="font-data text-[40px] leading-10 font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </span>
      <span className="text-sm leading-5 text-ink-muted">{children}</span>
    </a>
  );
}

/** Small state chip: calm sage when all is done, brand outline when not. */
function Chip({
  tone,
  children,
}: {
  tone: "ok" | "todo";
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs leading-5 font-semibold",
        tone === "ok"
          ? "bg-accent text-on-accent"
          : "border border-brand text-brand",
      )}
    >
      {children}
    </span>
  );
}

function SectionHead({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 md:px-6 md:pt-6">
      <h2 className="text-lg leading-6 font-semibold text-ink">{title}</h2>
      <a
        href={href}
        className="inline-flex items-center gap-1 text-sm font-semibold text-ink no-underline hover:text-brand"
      >
        {linkLabel}
        <ArrowRight {...iconProps} size={16} />
      </a>
    </div>
  );
}

type RecentItem =
  { kind: "project"; item: AdminProject } | { kind: "news"; item: AdminNews };

function RecentActivity({ recent }: { recent: RecentItem[] }) {
  return (
    <Card className="flex flex-col overflow-hidden p-0! md:p-0!">
      <SectionHead
        title="Actividad reciente"
        href="/admin/proyectos"
        linkLabel="Ver proyectos"
      />
      {recent.length === 0 ? (
        <p className="px-5 pt-3 pb-6 text-ink-muted md:px-6">
          Todavía no hay proyectos ni noticias. Crea el primero con los botones
          de arriba.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col pb-2">
          {recent.map(({ kind, item }) => (
            <li key={`${kind}-${item.id}`}>
              <a
                href={
                  kind === "project"
                    ? editProjectHref(item.id)
                    : editNewsHref(item.id)
                }
                className="flex items-center gap-4 px-5 py-3 text-ink no-underline transition-colors hover:bg-surface-sunken hover:text-ink md:px-6"
              >
                {item.cover?.url ? (
                  <FadeImage
                    src={item.cover.url}
                    alt=""
                    width={item.cover.width}
                    height={item.cover.height}
                    className="hidden aspect-[4/3] w-14 shrink-0 rounded-sm object-cover sm:block"
                  />
                ) : (
                  <span className="hidden aspect-[4/3] w-14 shrink-0 place-items-center rounded-sm bg-surface-sunken text-ink-muted sm:grid">
                    {kind === "project" ? (
                      <FolderKanban {...iconProps} />
                    ) : (
                      <FileText {...iconProps} />
                    )}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 font-semibold sm:truncate">
                    {item.title || "Sin título"}
                  </span>
                  <span className="text-sm text-ink-muted">
                    {kind === "project" ? "Proyecto" : "Noticia"} · editado{" "}
                    {relativeTime(item.updatedAt)}
                  </span>
                </span>
                <StatusBadge status={item.status} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const user = useUser();
  const dashboard = useDashboard();
  const firstName = (user.name || "").split(/\s+/)[0];
  const data = dashboard.data;
  const drafts = data ? data.projects.draft + data.news.draft : 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-ink-muted first-letter:uppercase">
            {todayFormat.format(new Date())}
          </p>
          <h2 className="text-[28px] leading-9 font-semibold tracking-[-0.01em] text-ink">
            Hola{firstName ? `, ${firstName}` : ""}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/proyectos/nuevo">
            <Plus {...iconProps} />
            Nuevo proyecto
          </ButtonLink>
          <ButtonLink href="/admin/noticias/nueva" variant="secondary">
            <Plus {...iconProps} />
            Nueva noticia
          </ButtonLink>
        </div>
      </header>

      {dashboard.error && (
        <ErrorNotice
          error={dashboard.error}
          retry={() => void dashboard.refetch()}
        />
      )}

      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          <Card className="overflow-hidden p-0! md:p-0!">
            <h2 className="sr-only">El sitio en cifras</h2>
            <div
              className={cx(
                "grid grid-cols-2 divide-border lg:divide-x max-lg:[&>*:nth-child(-n+2)]:border-b max-lg:[&>*:nth-child(odd)]:border-r",
                "lg:grid-cols-3",
              )}
            >
              <Stat
                label="Proyectos"
                value={data.projects.published}
                href="/admin/proyectos"
                icon={FolderKanban}
              >
                publicados en el sitio
              </Stat>
              <Stat
                label="Noticias"
                value={data.news.published}
                href="/admin/noticias"
                icon={FileText}
              >
                publicadas en el sitio
              </Stat>
              <Stat
                label="Borradores"
                value={drafts}
                href={
                  data.projects.draft > 0 || data.news.draft === 0
                    ? "/admin/proyectos"
                    : "/admin/noticias"
                }
                icon={Pencil}
              >
                {drafts === 0 ? (
                  <Chip tone="ok">Todo publicado</Chip>
                ) : (
                  <Chip tone="todo">Por terminar</Chip>
                )}
              </Stat>
            </div>
          </Card>

          <RecentActivity recent={data.recent} />
        </>
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
      className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end"
    >
      <Field
        label="Nombre"
        className="sm:w-80"
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

/** Icon in a soft circle beside a card heading. */
function CardHead({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof KeyRound;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink">
        <Icon {...iconProps} />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg leading-6 font-semibold text-ink">{title}</h2>
        <p className="max-w-[55ch] text-ink-muted">{children}</p>
      </div>
    </div>
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
  const [confirmEndAll, setConfirmEndAll] = useState(false);
  const [endingAll, setEndingAll] = useState(false);
  const RoleIcon = user.role === "admin" ? ShieldCheck : PenLine;

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
    <div className="flex w-full flex-col gap-6">
      <Card className="overflow-hidden p-0! md:p-0!">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center md:p-6">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-inverse text-xl font-semibold tracking-[0.04em] text-ink-inverse"
          >
            {initials(user.name || user.email)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="truncate text-[28px] leading-9 font-semibold tracking-[-0.01em] text-ink">
              {user.name || "Sin nombre"}
            </h2>
            <p className="truncate text-ink-muted">{user.email}</p>
          </div>
          {!editingName && (
            <Button
              variant="secondary"
              className="self-start sm:self-center"
              onClick={() => setEditingName(true)}
            >
              <Pencil {...iconProps} />
              Cambiar nombre
            </Button>
          )}
        </div>
        {editingName && (
          <div className="border-t border-border px-5 pb-5 md:px-6 md:pb-6">
            <NameForm name={user.name} onDone={() => setEditingName(false)} />
          </div>
        )}
        <div className="flex items-start gap-3 border-t border-border bg-surface-sunken/50 px-5 py-4 md:px-6">
          <RoleIcon {...iconProps} className="mt-0.5 shrink-0 text-ink" />
          <p className="text-ink">
            <span className="font-semibold">{ROLE_LABEL[user.role]}.</span>{" "}
            <span className="text-ink-muted">{ROLE_HINT[user.role]}</span>
            {user.role === "editor" && (
              <span className="text-ink-muted">
                {" "}
                Para cambiar tu rol, pídeselo a un administrador.
              </span>
            )}
          </p>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-5">
          <CardHead icon={KeyRound} title="Contraseña">
            Para cambiarla te enviamos un enlace a tu correo. Así nadie puede
            cambiarla solo con tener tu computador abierto.
          </CardHead>
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
              <Mail {...iconProps} />
              {state.kind === "busy"
                ? "Enviando…"
                : state.kind === "sent"
                  ? "Enviar otro enlace"
                  : "Enviarme el enlace"}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <CardHead icon={MonitorSmartphone} title="Sesiones">
            Si entraste desde un computador que no es tuyo o perdiste tu
            celular, cierra la sesión en todos los dispositivos.
          </CardHead>
          {confirmEndAll ? (
            <div className="flex flex-col gap-3">
              <Notice tone="info">
                También se cerrará aquí: tendrás que volver a entrar con tu
                correo y contraseña.
              </Notice>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={endingAll}
                  onClick={() => void endAllSessions()}
                >
                  <LogOut {...iconProps} />
                  {endingAll ? "Cerrando…" : "Sí, cerrar en todos"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={endingAll}
                  onClick={() => setConfirmEndAll(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button
                variant="secondary"
                onClick={() => setConfirmEndAll(true)}
              >
                <LogOut {...iconProps} />
                Cerrar sesión en todos los dispositivos
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
