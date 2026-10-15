/**
 * Medios: the image library. A grid of every image with its description,
 * size and where it is used; upload new images; open one to change its
 * alternative text, see where it appears, or delete it (with a warning
 * when deleting would leave a cover or gallery without it).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Images,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import type { AdminMedia } from "../lib/admin/api";
import { problemMessage } from "../lib/admin/errors";
import {
  ALT_MAX,
  altError,
  formatBytes,
  mediaUsage,
  smallForCover,
  type MediaUse,
} from "../lib/admin/media";
import { charCount } from "../lib/admin/project-form";
import type { ApiResult } from "../lib/api/client";
import { adminApi } from "./api";
import { ErrorNotice, formatDate, unwrap } from "./common";
import { MediaThumb, MediaUploader, useMediaLibrary } from "./MediaPicker";
import { MediaGridSkeleton } from "./skeletons";
import { Button, Card, Counter, cx, Dialog, Notice, TextArea } from "./ui";

const iconProps = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;
const MEDIA_KEY = ["media-all"] as const;
const USAGE_KEY = ["media-usage"] as const;
const PAGE = 50;
const MAX_PAGES = 20;

type Filter = "all" | "used" | "unused";

/** Every item of a paginated admin list (projects and news are few). */
async function listAll<T>(
  load: (q: {
    page: number;
    pageSize: number;
  }) => Promise<ApiResult<{ items: T[]; total: number }>>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = unwrap(await load({ page, pageSize: PAGE }));
    items.push(...data.items);
    if (items.length >= data.total || data.items.length === 0) break;
  }
  return items;
}

/** Where each image is used: projects, news and the home hero. */
function useMediaUsage() {
  return useQuery({
    queryKey: USAGE_KEY,
    queryFn: async () => {
      const [projects, news, hero] = await Promise.all([
        listAll((q) => adminApi.listProjects(q)),
        listAll((q) => adminApi.listNews(q)),
        adminApi.getHomeHero(),
      ]);
      return mediaUsage({
        projects,
        news,
        hero: hero.ok ? hero.data : null,
      });
    },
  });
}

const dimensions = (m: AdminMedia) =>
  m.width ? `${m.width} × ${m.height} px` : "Medidas desconocidas";

const KIND_LABEL: Record<AdminMedia["mime"], string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
};

function UsageChip({ uses }: { uses: MediaUse[] | undefined }) {
  if (uses === undefined) return null;
  const count = uses.length;
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs leading-5 font-semibold whitespace-nowrap",
        count > 0
          ? "bg-accent text-on-accent"
          : "border border-border-strong text-ink-muted",
      )}
    >
      {count === 0
        ? "Sin usar"
        : count === 1
          ? "En 1 lugar"
          : `En ${count} lugares`}
    </span>
  );
}

function MediaCard({
  media,
  uses,
  onOpen,
}: {
  media: AdminMedia;
  uses: MediaUse[] | undefined;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised text-left transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <span className="relative block overflow-hidden">
          <MediaThumb
            media={media}
            sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </span>
        <span className="flex flex-1 flex-col gap-2 p-3">
          <span className="line-clamp-2 min-h-10 text-sm leading-5 font-medium text-ink">
            {media.alt || "Sin descripción"}
          </span>
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-data text-xs text-ink-muted tabular-nums">
              {media.width ? `${media.width}×${media.height}` : "—"} ·{" "}
              {formatBytes(media.size)}
            </span>
            <UsageChip uses={uses} />
          </span>
        </span>
      </button>
    </li>
  );
}

function DetailDialog({
  media,
  uses,
  onClose,
}: {
  media: AdminMedia;
  uses: MediaUse[] | undefined;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [alt, setAlt] = useState(media.alt);
  const [altProblem, setAltProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const changed = alt.trim() !== media.alt;

  async function save() {
    const error = altError(alt);
    if (error) {
      setAltProblem(error);
      return;
    }
    setSaving(true);
    setFailure(null);
    const result = await adminApi.updateMedia(media.id, alt.trim());
    setSaving(false);
    if (!result.ok) {
      setFailure(problemMessage(result));
      return;
    }
    queryClient.setQueryData<AdminMedia[]>(MEDIA_KEY, (items) =>
      (items ?? []).map((m) => (m.id === media.id ? result.data : m)),
    );
    setSaved(true);
  }

  async function remove() {
    setDeleting(true);
    setFailure(null);
    const result = await adminApi.deleteMedia(media.id);
    setDeleting(false);
    if (!result.ok) {
      setFailure(problemMessage(result));
      return;
    }
    queryClient.setQueryData<AdminMedia[]>(MEDIA_KEY, (items) =>
      (items ?? []).filter((m) => m.id !== media.id),
    );
    // Covers, galleries and lists that showed it are now stale.
    void queryClient.invalidateQueries({ queryKey: USAGE_KEY });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["news"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    onClose();
  }

  const inUse = (uses?.length ?? 0) > 0;
  // The API clears covers and galleries, but the home hero must always
  // keep its photos: change them in Portada first.
  const inHero = uses?.some((u) => u.kind === "Inicio") ?? false;

  return (
    <Dialog
      title="Detalle de la imagen"
      size="lg"
      onClose={onClose}
      footer={
        confirmDelete ? (
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              No, conservarla
            </Button>
            <Button
              onClick={() => void remove()}
              disabled={deleting || inHero || uses === undefined}
            >
              <Trash2 {...iconProps} />
              {deleting ? "Eliminando…" : "Sí, eliminar"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 {...iconProps} />
              Eliminar
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={() => void save()} disabled={!changed || saving}>
              {saving ? "Guardando…" : "Guardar descripción"}
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3">
          <MediaThumb
            media={media}
            sizes="(min-width: 768px) 560px, 100vw"
            className="max-h-[60dvh] w-full rounded-md bg-surface-sunken object-contain"
          />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">Medidas</dt>
              <dd className="font-data tabular-nums">{dimensions(media)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Peso</dt>
              <dd className="font-data tabular-nums">
                {formatBytes(media.size)} · {KIND_LABEL[media.mime]}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Subida</dt>
              <dd>
                <time dateTime={media.createdAt}>
                  {formatDate(media.createdAt)}
                </time>
              </dd>
            </div>
          </dl>
          {smallForCover(media) && (
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <TriangleAlert {...iconProps} size={16} className="mt-0.5" />
              Mide menos de 1.600 px de ancho: sirve para galerías, pero en una
              portada puede verse borrosa.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {confirmDelete ? (
            <Notice tone="error">
              {inHero ? (
                <>
                  Esta imagen es una de las fotos del inicio del sitio. Para
                  eliminarla, primero cámbiala en{" "}
                  <a href="/admin/portada" className="font-semibold">
                    Portada
                  </a>
                  .
                </>
              ) : inUse ? (
                <>
                  Esta imagen se usa en{" "}
                  {uses?.length === 1 ? "1 lugar" : `${uses?.length} lugares`}.
                  Al eliminarla se quitará de cada portada, galería e imagen
                  para compartir donde aparece. No se puede deshacer.
                </>
              ) : (
                "La imagen no se usa en ningún lugar. Al eliminarla desaparece de la biblioteca. No se puede deshacer."
              )}
            </Notice>
          ) : (
            <div className="flex flex-col gap-2">
              <TextArea
                label="¿Qué muestra la imagen?"
                rows={3}
                hint="Lo leen las personas que usan lectores de pantalla y Google."
                value={alt}
                maxLength={ALT_MAX + 20}
                onChange={(e) => {
                  setAlt(e.target.value);
                  setAltProblem(null);
                  setSaved(false);
                }}
                error={altProblem ?? undefined}
                aside={<Counter count={charCount(alt)} max={ALT_MAX} />}
              />
              {saved && !changed && (
                <p role="status" className="text-sm text-ink-muted">
                  Descripción guardada.
                </p>
              )}
            </div>
          )}

          {failure && <Notice tone="error">{failure}</Notice>}

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-ink">Dónde se usa</h3>
            {uses === undefined ? (
              <p className="text-sm text-ink-muted">Revisando…</p>
            ) : uses.length === 0 ? (
              <p className="text-sm text-ink-muted">
                En ningún proyecto, noticia ni en la portada del sitio.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {uses.map((use) => (
                  <li key={use.href}>
                    <a
                      href={use.href}
                      className="flex items-center gap-3 px-3 py-2.5 text-ink no-underline transition-colors hover:bg-surface-sunken hover:text-ink"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold">
                          {use.label}
                        </span>
                        <span className="text-sm text-ink-muted first-letter:uppercase">
                          {use.kind} · {use.roles.join(", ")}
                        </span>
                      </span>
                      <ArrowRight {...iconProps} size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Dialog>
  );
}

export function MediaLibraryPage() {
  const library = useMediaLibrary();
  const usage = useMediaUsage();
  const [filter, setFilter] = useState<Filter>("all");
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(0);

  const items = library.data ?? [];
  const usageMap = usage.data;
  const usesOf = (id: string) =>
    usageMap ? (usageMap.get(id) ?? []) : undefined;
  const usedCount = usageMap
    ? items.filter((m) => usageMap.has(m.id)).length
    : undefined;
  const shown = items.filter((m) =>
    filter === "all" || !usageMap
      ? true
      : filter === "used"
        ? usageMap.has(m.id)
        : !usageMap.has(m.id),
  );
  const open = items.find((m) => m.id === openId);
  const tabs: { value: Filter; label: string; count: number | undefined }[] = [
    {
      value: "all",
      label: "Todas",
      count: library.data ? items.length : undefined,
    },
    { value: "used", label: "En uso", count: usedCount },
    {
      value: "unused",
      label: "Sin usar",
      count: usedCount === undefined ? undefined : items.length - usedCount,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <fieldset>
          <legend className="sr-only">Mostrar</legend>
          <div className="inline-flex min-h-11 max-w-full items-stretch gap-1 overflow-x-auto rounded-full border border-border bg-surface-raised p-1">
            {tabs.map((t) => {
              const active = filter === t.value;
              return (
                <label
                  key={t.value}
                  className={cx(
                    "flex cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors has-focus-visible:outline-2 has-focus-visible:outline-focus-ring",
                    active
                      ? "bg-surface-inverse text-ink-inverse"
                      : "text-ink hover:bg-surface-sunken",
                  )}
                >
                  <input
                    type="radio"
                    name="filtro-medios"
                    value={t.value}
                    checked={active}
                    onChange={() => setFilter(t.value)}
                    className="sr-only"
                  />
                  {t.label}
                  {t.count !== undefined && (
                    <span
                      className={cx(
                        "font-data text-xs tabular-nums",
                        active ? "text-ink-inverse" : "text-ink-muted",
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button
          onClick={() => setUploading((v) => !v)}
          variant={uploading ? "secondary" : "primary"}
          aria-expanded={uploading}
        >
          {uploading ? <X {...iconProps} /> : <Upload {...iconProps} />}
          {uploading ? "Listo" : "Subir imágenes"}
        </Button>
      </div>

      {uploading && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg leading-6 font-semibold text-ink">
            Subir imágenes
          </h2>
          <MediaUploader
            multiple
            hint="Para portadas, idealmente de 1.600 px de ancho o más."
            onUploaded={() => {
              setJustUploaded((n) => n + 1);
              setFilter("all");
            }}
          />
          {justUploaded > 0 && (
            <p role="status" className="text-sm text-ink-muted">
              {justUploaded === 1
                ? "1 imagen subida a la biblioteca."
                : `${justUploaded} imágenes subidas a la biblioteca.`}
            </p>
          )}
        </Card>
      )}

      {library.error && (
        <ErrorNotice
          error={library.error}
          retry={() => void library.refetch()}
        />
      )}

      {library.isPending ? (
        <MediaGridSkeleton />
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-surface-sunken text-ink-muted">
            <Images size={24} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="max-w-[44ch] text-ink-muted">
            Todavía no hay imágenes. Súbelas aquí o desde la portada o la
            galería de un proyecto o noticia.
          </p>
          {!uploading && (
            <Button onClick={() => setUploading(true)}>
              <Upload {...iconProps} />
              Subir imágenes
            </Button>
          )}
        </Card>
      ) : shown.length === 0 ? (
        <Card className="py-10 text-center text-ink-muted">
          {filter === "unused"
            ? "Todas las imágenes se usan en algún lugar."
            : "Ninguna imagen se usa todavía."}
        </Card>
      ) : (
        <>
          <h2 className="sr-only">Imágenes de la biblioteca</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {shown.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                uses={usesOf(media.id)}
                onOpen={() => setOpenId(media.id)}
              />
            ))}
          </ul>
        </>
      )}

      {open && (
        <DetailDialog
          key={open.id}
          media={open}
          uses={usesOf(open.id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
