/**
 * Panel pages inside the shell: Resumen (dashboard), Mensajes (contact
 * inbox, read-only), Cuenta, and the sections still under construction.
 */
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  FileText,
  FolderKanban,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { ContactMessage } from "../lib/admin/api";
import { problemMessage } from "../lib/admin/errors";
import { LOGIN_PATH } from "../lib/admin/redirect";
import { adminApi } from "./api";
import {
  ErrorNotice,
  formatDateTime as formatDate,
  pageFromUrl,
  Pagination,
  replaceParam,
  unwrap,
} from "./common";
import { useUser } from "./session";
import { Button, ButtonLink, Card, Notice } from "./ui";

/* ------------------------------------------------------------------ */
/* Resumen                                                             */
/* ------------------------------------------------------------------ */

function useCounts() {
  return useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [
        projectsDraft,
        projectsPublished,
        newsDraft,
        newsPublished,
        messages,
      ] = await Promise.all([
        adminApi.listProjects({ status: "draft", pageSize: 1 }),
        adminApi.listProjects({ status: "published", pageSize: 1 }),
        adminApi.listNews({ status: "draft", pageSize: 1 }),
        adminApi.listNews({ status: "published", pageSize: 1 }),
        adminApi.listMessages({ pageSize: 5 }),
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
        messages: unwrap(messages),
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
        <p className="text-ink-muted" role="status">
          Cargando el resumen…
        </p>
      ) : counts.data ? (
        <>
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

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg leading-6 font-semibold text-ink">
                Últimos mensajes
                <span className="ml-2 text-base font-medium text-ink-muted">
                  ({counts.data.messages.total} en total)
                </span>
              </h2>
              <ButtonLink
                href="/admin/mensajes"
                variant="ghost"
                className="-mx-5 sm:mx-0"
              >
                Ver todos
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
              </ButtonLink>
            </div>
            {counts.data.messages.items.length === 0 ? (
              <p className="mt-4 text-ink-muted">
                Todavía no llegan consultas por el formulario.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {counts.data.messages.items.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                  >
                    <span className="font-semibold text-ink">{m.name}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-muted">
                      {m.message}
                    </span>
                    <time
                      dateTime={m.createdAt}
                      className="shrink-0 text-sm text-ink-muted"
                    >
                      {formatDate(m.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mensajes                                                            */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20;

function MessageItem({
  message,
  serviceTitles,
}: {
  message: ContactMessage;
  serviceTitles: Record<string, string>;
}) {
  const service = message.service ? serviceTitles[message.service] : undefined;
  return (
    <article className="flex flex-col gap-3 py-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg leading-6 font-semibold text-ink">
          {message.name}
          {message.company && (
            <span className="font-medium text-ink-muted">
              {" "}
              · {message.company}
            </span>
          )}
        </h3>
        <time dateTime={message.createdAt} className="text-sm text-ink-muted">
          {formatDate(message.createdAt)}
        </time>
      </header>
      <p className="max-w-[70ch] text-base leading-7 whitespace-pre-line text-ink">
        {message.message}
      </p>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <li>
          <a
            href={`mailto:${message.email}`}
            className="inline-flex items-center gap-1.5"
          >
            <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
            {message.email}
          </a>
        </li>
        {message.phone && (
          <li>
            <a
              href={`tel:${message.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1.5"
            >
              <Phone size={16} strokeWidth={1.75} aria-hidden="true" />
              {message.phone}
            </a>
          </li>
        )}
        {service && <li className="text-ink-muted">Servicio: {service}</li>}
        {message.location && (
          <li className="text-ink-muted">Ubicación: {message.location}</li>
        )}
      </ul>
    </article>
  );
}

export function MessagesPage({
  serviceTitles,
}: {
  serviceTitles: Record<string, string>;
}) {
  const [page, setPage] = useState(pageFromUrl);
  const query = useQuery({
    queryKey: ["messages", page],
    queryFn: async () =>
      unwrap(await adminApi.listMessages({ page, pageSize: PAGE_SIZE })),
  });

  function go(next: number) {
    setPage(next);
    replaceParam("page", String(next));
    document.getElementById("contenido")?.focus();
  }

  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE))
    : 1;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Notice tone="info">
        Estos mensajes contienen datos personales. Úsalos solo para responder la
        consulta y no los compartas fuera de EMOJ.
      </Notice>
      {query.error && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}
      <Card>
        {query.isPending ? (
          <p className="text-ink-muted" role="status">
            Cargando mensajes…
          </p>
        ) : query.data && query.data.items.length === 0 ? (
          <p className="text-ink-muted">
            Todavía no llegan consultas por el formulario.
          </p>
        ) : query.data ? (
          <>
            <h2 className="sr-only">Mensajes recibidos</h2>
            <div className="-my-5 divide-y divide-border">
              {query.data.items.map((m) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  serviceTitles={serviceTitles}
                />
              ))}
            </div>
          </>
        ) : null}
      </Card>
      {query.data && (
        <Pagination
          label="Páginas de mensajes"
          page={page}
          totalPages={totalPages}
          onChange={go}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cuenta                                                              */
/* ------------------------------------------------------------------ */

export function AccountPage() {
  const user = useUser();
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
        <h2 className="text-lg leading-6 font-semibold text-ink">Tus datos</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-muted">Nombre</dt>
            <dd className="text-ink">{user.name || "Sin nombre"}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Correo</dt>
            <dd className="break-all text-ink">{user.email}</dd>
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
