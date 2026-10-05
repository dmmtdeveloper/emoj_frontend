/**
 * Proyectos: every project (drafts included), last updated first, with
 * search by name, a status filter and pagination. The filters live in the
 * URL, so a reload or a shared link keeps them.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExternalLink, ImageOff, Pencil, Plus, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { AdminProject } from "../lib/admin/api";
import { adminApi } from "./api";
import {
  ErrorNotice,
  formatDate,
  pageFromUrl,
  Pagination,
  replaceParam,
  unwrap,
} from "./common";
import { ButtonLink, Card, cx, StatusBadge } from "./ui";

const PAGE_SIZE = 20;

type StatusFilter = "" | "draft" | "published";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Borradores" },
];

function statusFromUrl(): StatusFilter {
  const raw = new URLSearchParams(window.location.search).get("estado");
  return raw === "draft" || raw === "published" ? raw : "";
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export function editProjectHref(id: string): string {
  return `/admin/proyectos/editar?id=${encodeURIComponent(id)}`;
}

function Cover({ project }: { project: AdminProject }) {
  return project.cover?.url ? (
    <img
      src={project.cover.url}
      alt=""
      loading="lazy"
      decoding="async"
      className="aspect-[4/3] w-20 shrink-0 rounded-sm bg-surface-sunken object-cover"
    />
  ) : (
    <span className="grid aspect-[4/3] w-20 shrink-0 place-items-center rounded-sm bg-surface-sunken text-ink-muted">
      <ImageOff size={18} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

function ProjectRow({ project }: { project: AdminProject }) {
  const meta = [project.client, project.location].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-4 py-4">
      <Cover project={project} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a
          href={editProjectHref(project.id)}
          className="truncate text-base leading-6 font-semibold text-ink no-underline hover:text-ink hover:underline"
        >
          {project.title || "Sin nombre"}
        </a>
        {meta && <p className="truncate text-sm text-ink-muted">{meta}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <StatusBadge status={project.status} />
          {project.featured && <span>Destacado</span>}
          <span>
            Editado el{" "}
            <time dateTime={project.updatedAt}>
              {formatDate(project.updatedAt)}
            </time>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {project.status === "published" && (
          <a
            href={`/proyectos/${project.slug}`}
            target="_blank"
            rel="noopener"
            className="hidden size-11 place-items-center rounded-md text-ink hover:bg-surface-sunken hover:text-ink sm:grid"
          >
            <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">
              Ver «{project.title}» en el sitio (se abre en una pestaña nueva)
            </span>
          </a>
        )}
        <a
          href={editProjectHref(project.id)}
          className="grid size-11 place-items-center rounded-md text-ink hover:bg-surface-sunken hover:text-ink"
        >
          <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">Editar «{project.title}»</span>
        </a>
      </div>
    </li>
  );
}

export function ProjectsPage() {
  const searchId = useId();
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get("q") ?? "",
  );
  const [status, setStatus] = useState<StatusFilter>(statusFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  const q = useDebounced(search.trim(), 300);

  const query = useQuery({
    queryKey: ["projects", { q, status, page }],
    queryFn: async () =>
      unwrap(
        await adminApi.listProjects({
          q,
          ...(status ? { status } : {}),
          page,
          pageSize: PAGE_SIZE,
        }),
      ),
    placeholderData: keepPreviousData,
  });

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
    replaceParam("q", value.trim());
    replaceParam("page", null);
  }

  function changeStatus(value: StatusFilter) {
    setStatus(value);
    setPage(1);
    replaceParam("estado", value);
    replaceParam("page", null);
  }

  function changePage(next: number) {
    setPage(next);
    replaceParam("page", next > 1 ? String(next) : null);
    document.getElementById("contenido")?.focus();
  }

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const filtered = q !== "" || status !== "";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={searchId}
              className="text-sm leading-5 font-semibold text-ink"
            >
              Buscar por nombre
            </label>
            <div className="relative">
              <Search
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
              />
              <input
                id={searchId}
                type="search"
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder="Ej.: canal, puente…"
                className="min-h-11 w-full rounded-md border border-border-strong bg-surface-raised py-2.5 pr-3 pl-10 text-base text-ink placeholder:text-ink-muted sm:w-72"
              />
            </div>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm leading-5 font-semibold text-ink">
              Estado
            </legend>
            <div className="inline-flex min-h-11 items-stretch rounded-md border border-border-strong bg-surface-raised p-1">
              {FILTERS.map((f) => (
                <label
                  key={f.value}
                  className={cx(
                    "flex cursor-pointer items-center rounded-sm px-3 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-focus-ring",
                    status === f.value
                      ? "bg-surface-inverse text-ink-inverse"
                      : "text-ink hover:bg-surface-sunken",
                  )}
                >
                  <input
                    type="radio"
                    name="estado"
                    value={f.value}
                    checked={status === f.value}
                    onChange={() => changeStatus(f.value)}
                    className="sr-only"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <ButtonLink href="/admin/proyectos/nuevo" className="self-start">
          <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
          Nuevo proyecto
        </ButtonLink>
      </div>

      {query.error && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}

      <Card className={cx(query.isFetching && data && "opacity-70")}>
        {query.isPending ? (
          <p role="status" className="text-ink-muted">
            Cargando proyectos…
          </p>
        ) : data && data.items.length === 0 ? (
          <p className="text-ink-muted">
            {filtered
              ? "No hay proyectos que coincidan con la búsqueda."
              : "Todavía no hay proyectos. Crea el primero con «Nuevo proyecto»."}
          </p>
        ) : data ? (
          <>
            <h2 className="sr-only">Lista de proyectos</h2>
            <p className="text-sm text-ink-muted" role="status">
              {data.total === 1 ? "1 proyecto" : `${data.total} proyectos`}
            </p>
            <ul className="divide-y divide-border">
              {data.items.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </ul>
          </>
        ) : null}
      </Card>

      {data && (
        <Pagination
          label="Páginas de proyectos"
          page={page}
          totalPages={totalPages}
          onChange={changePage}
        />
      )}
    </div>
  );
}
