/**
 * List page shared by Proyectos and Noticias: every item (drafts included),
 * last updated first, with search by title, a status filter and
 * pagination. The filters live in the URL, so a reload or a shared link
 * keeps them.
 *
 * Same visual language as the Resumen: full width, a card with a toolbar
 * and a table-like list whose rows open the editor, status tabs with their
 * counts, and relative times ("hace 2 h").
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  ImageOff,
  Plus,
  Search,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import type { AdminListQuery } from "../lib/admin/api";
import { relativeTime } from "../lib/admin/dashboard";
import { resultSummary } from "../lib/admin/pagination";
import type { ApiResult, MediaRef } from "../lib/api/client";
import {
  ErrorNotice,
  formatDate,
  pageFromUrl,
  Pagination,
  replaceParam,
  unwrap,
} from "./common";
import { ListSkeleton } from "./skeletons";
import { Button, ButtonLink, Card, cx, FadeImage, StatusBadge } from "./ui";

const DEFAULT_PAGE_SIZE = 20;

const iconProps = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;

/** Row grid shared by the column header and the rows (desktop). */
const ROW_GRID =
  "lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_8.5rem_8rem_2.75rem] lg:items-center lg:gap-6";

type StatusFilter = "" | "draft" | "published";

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

export interface ListRow {
  id: string;
  title: string;
  editHref: string;
  /** Public page while published. */
  siteHref: string | null;
  /** Second column: client, category… */
  meta: string;
  /** Muted line under `meta`: location… */
  metaSub?: string | undefined;
  cover: MediaRef | undefined;
  status: "draft" | "published";
  /** Marks the item as featured on the site. */
  featured?: boolean | undefined;
  updatedAt: string;
}

export interface ListConfig<T> {
  queryKey: string;
  load: (
    query: AdminListQuery,
  ) => Promise<ApiResult<{ items: T[]; total: number }>>;
  toRow: (item: T) => ListRow;
  /** "proyecto" / "noticia" and plurals, for counts and messages. */
  one: string;
  many: string;
  /** Column headers: the item ("Proyecto") and its `meta` ("Cliente"). */
  columns: { item: string; meta: string };
  /** Icon of the empty state. */
  icon: LucideIcon;
  filters: { all: string; published: string; draft: string };
  newHref: string;
  newLabel: string;
  /** Items per page (default 20). */
  pageSize?: number;
  searchPlaceholder: string;
  empty: ReactNode;
}

/** Totals per status for the tabs; they follow the search. */
function useStatusCounts<T>(config: ListConfig<T>, q: string) {
  return useQuery({
    queryKey: [config.queryKey, "counts", { q }],
    queryFn: async () => {
      const [draft, published] = await Promise.all([
        config.load({ q, status: "draft", pageSize: 1 }),
        config.load({ q, status: "published", pageSize: 1 }),
      ]);
      const counts = {
        draft: unwrap(draft).total,
        published: unwrap(published).total,
      };
      return { ...counts, all: counts.draft + counts.published };
    },
    placeholderData: keepPreviousData,
  });
}

function Cover({ row }: { row: ListRow }) {
  return row.cover?.url ? (
    <FadeImage
      src={row.cover.url}
      alt=""
      loading="lazy"
      decoding="async"
      width={row.cover.width}
      height={row.cover.height}
      className="aspect-[4/3] w-16 shrink-0 rounded-sm object-cover sm:w-20"
    />
  ) : (
    <span className="grid aspect-[4/3] w-16 shrink-0 place-items-center rounded-sm bg-surface-sunken text-ink-muted sm:w-20">
      <ImageOff {...iconProps} />
      <span className="sr-only">Sin portada</span>
    </span>
  );
}

/** "Destacado" with a star; `compact` keeps only the star (small screens). */
function FeaturedTag({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title={compact ? "Destacado" : undefined}
      className="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-ink-muted"
    >
      <Star {...iconProps} size={14} className="fill-current" />
      <span className={cx(compact && "sr-only")}>Destacado</span>
    </span>
  );
}

/**
 * One item. The title link stretches over the whole row, so any click
 * opens the editor; "Ver en el sitio" sits above it (`relative z-10`).
 */
function Row({ row }: { row: ListRow }) {
  const edited = (
    <time dateTime={row.updatedAt} title={formatDate(row.updatedAt)}>
      {relativeTime(row.updatedAt)}
    </time>
  );
  return (
    <li
      className={cx(
        "relative flex items-center gap-4 px-5 py-3.5 transition-colors focus-within:bg-surface-sunken hover:bg-surface-sunken md:px-6",
        ROW_GRID,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Cover row={row} />
        <div className="flex min-w-0 flex-col gap-1">
          <a
            href={row.editHref}
            className="line-clamp-2 text-base leading-6 font-semibold text-ink no-underline after:absolute after:inset-0 after:content-[''] hover:text-ink focus-visible:outline-none sm:truncate lg:line-clamp-none"
          >
            {row.title || "Sin título"}
            <span className="sr-only">, editar</span>
          </a>
          {/* Small screens: meta, status and time under the title. */}
          {(row.meta || row.metaSub) && (
            <p className="truncate text-sm text-ink-muted lg:hidden">
              {[row.meta, row.metaSub].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm whitespace-nowrap text-ink-muted lg:hidden">
            <StatusBadge status={row.status} />
            {row.featured && <FeaturedTag compact />}
            <span className="truncate">{edited}</span>
          </div>
          {row.featured && (
            <span className="hidden lg:block">
              <FeaturedTag />
            </span>
          )}
        </div>
      </div>
      <div className="hidden min-w-0 flex-col lg:flex">
        <span className="truncate text-base text-ink">{row.meta || "—"}</span>
        {row.metaSub && (
          <span className="truncate text-sm text-ink-muted">{row.metaSub}</span>
        )}
      </div>
      <div className="hidden lg:block">
        <StatusBadge status={row.status} />
      </div>
      <div className="hidden text-sm text-ink-muted lg:block">{edited}</div>
      <div className="relative z-10 shrink-0">
        {row.siteHref ? (
          <a
            href={row.siteHref}
            target="_blank"
            rel="noopener"
            title="Ver en el sitio"
            className="grid size-11 place-items-center rounded-md text-ink hover:bg-surface hover:text-brand"
          >
            <ExternalLink {...iconProps} />
            <span className="sr-only">
              Ver «{row.title}» en el sitio (se abre en una pestaña nueva)
            </span>
          </a>
        ) : (
          <span className="block size-11" aria-hidden="true" />
        )}
      </div>
    </li>
  );
}

function StatusTabs({
  value,
  onChange,
  options,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  options: { value: StatusFilter; label: string; count: number | undefined }[];
}) {
  return (
    <fieldset>
      <legend className="sr-only">Estado</legend>
      <div className="inline-flex min-h-11 max-w-full items-stretch gap-1 overflow-x-auto rounded-full border border-border bg-surface-raised p-1">
        {options.map((f) => {
          const active = value === f.value;
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
                name="estado"
                value={f.value}
                checked={active}
                onChange={() => onChange(f.value)}
                className="sr-only"
              />
              {f.label}
              {f.count !== undefined && (
                <span
                  className={cx(
                    "font-data text-xs tabular-nums",
                    active ? "text-ink-inverse" : "text-ink-muted",
                  )}
                >
                  {f.count}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function EmptyState({
  icon: Icon,
  children,
  action,
}: {
  icon: LucideIcon;
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-surface-sunken text-ink-muted">
        <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="max-w-[44ch] text-base text-ink-muted">{children}</p>
      {action}
    </div>
  );
}

export function ContentListPage<T>({ config }: { config: ListConfig<T> }) {
  const pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE;
  const searchId = useId();
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get("q") ?? "",
  );
  const [status, setStatus] = useState<StatusFilter>(statusFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  const q = useDebounced(search.trim(), 300);

  const query = useQuery({
    queryKey: [config.queryKey, { q, status, page, pageSize }],
    queryFn: async () =>
      unwrap(
        await config.load({
          q,
          ...(status ? { status } : {}),
          page,
          pageSize,
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const counts = useStatusCounts(config, q).data;

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

  function clearFilters() {
    changeSearch("");
    changeStatus("");
  }

  function changePage(next: number) {
    setPage(next);
    replaceParam("page", next > 1 ? String(next) : null);
    document.getElementById("contenido")?.focus();
  }

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const filtered = q !== "" || status !== "";
  const tabs: {
    value: StatusFilter;
    label: string;
    count: number | undefined;
  }[] = [
    { value: "", label: config.filters.all, count: counts?.all },
    {
      value: "published",
      label: config.filters.published,
      count: counts?.published,
    },
    { value: "draft", label: config.filters.draft, count: counts?.draft },
  ];
  const newButton = (
    <ButtonLink href={config.newHref}>
      <Plus {...iconProps} />
      {config.newLabel}
    </ButtonLink>
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusTabs value={status} onChange={changeStatus} options={tabs} />
        {newButton}
      </div>

      {query.error && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}

      <Card className="overflow-hidden p-0! md:p-0!">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="relative w-full sm:max-w-sm">
            <label htmlFor={searchId} className="sr-only">
              Buscar por título
            </label>
            <Search
              {...iconProps}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
            />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder={`Buscar por título. ${config.searchPlaceholder}`}
              className="min-h-11 w-full rounded-full border border-border-strong bg-surface py-2.5 pr-4 pl-11 text-base text-ink placeholder:text-ink-muted"
            />
          </div>
          {data && data.items.length > 0 && (
            <p
              className="shrink-0 text-sm text-ink-muted tabular-nums"
              role="status"
            >
              {resultSummary({
                page,
                pageSize,
                total: data.total,
                one: config.one,
                many: config.many,
              })}
            </p>
          )}
        </div>

        {query.isPending ? (
          <div className="px-5 md:px-6">
            <ListSkeleton
              label={`Cargando ${config.many}…`}
              rows={Math.min(pageSize, 5)}
            />
          </div>
        ) : data && data.items.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={Search}
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  <X {...iconProps} />
                  Limpiar filtros
                </Button>
              }
            >
              No hay {config.many} que coincidan con la búsqueda.
            </EmptyState>
          ) : (
            <EmptyState icon={config.icon} action={newButton}>
              {config.empty}
            </EmptyState>
          )
        ) : data ? (
          <div
            className={cx(
              "transition-opacity",
              query.isFetching && "opacity-60",
            )}
          >
            <h2 className="sr-only">Lista de {config.many}</h2>
            <div
              aria-hidden="true"
              className={cx(
                "hidden border-b border-border px-6 py-2.5 text-xs font-medium tracking-[0.06em] text-ink-muted uppercase",
                ROW_GRID,
              )}
            >
              <span>{config.columns.item}</span>
              <span>{config.columns.meta}</span>
              <span>Estado</span>
              <span>Última edición</span>
              <span />
            </div>
            <ul className="divide-y divide-border">
              {data.items.map((item) => {
                const row = config.toRow(item);
                return <Row key={row.id} row={row} />;
              })}
            </ul>
          </div>
        ) : null}
      </Card>

      {data && (
        <Pagination
          label={`Páginas de ${config.many}`}
          page={page}
          totalPages={totalPages}
          onChange={changePage}
        />
      )}
    </div>
  );
}
