/**
 * What the project and news editors share:
 *
 * - `useContentEditor`: save (create or update), publish, unpublish and
 *   delete, with the API's field errors put on the form, the leave guard for
 *   unsaved changes, the error banner and the success dialog. Public changes
 *   refresh the site's pages right away (src/lib/admin/site-refresh.ts).
 *   Each editor passes an adapter with its API calls, mapping and wording.
 * - Pieces of the page: header with the actions (a bar that stays in view:
 *   under the navbar on desktop, at the bottom on phones), publishing checklist,
 *   "Google y redes sociales" card, single image chooser, delete card and
 *   the confirmation dialogs.
 */
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  ExternalLink,
  ImagePlus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type BaseSyntheticEvent,
  type ReactNode,
} from "react";
import type {
  FieldPath,
  FieldValues,
  UseFormRegisterReturn,
  UseFormReturn,
} from "react-hook-form";
import type { AdminMedia } from "../lib/admin/api";
import { problemMessage } from "../lib/admin/errors";
import { smallForCover } from "../lib/admin/media";
import {
  firstErrorField,
  tabForField,
  tabStatus,
  type EditorTab,
  type TabState,
} from "../lib/admin/editor-tabs";
import { charCount, type ChecklistItem } from "../lib/admin/project-form";
import {
  searchPreview,
  seoLength,
  type SearchPreviewInput,
  type SeoLength,
} from "../lib/admin/seo";
import {
  refreshSite,
  successNotice,
  type ContentNoun,
  type EditorAction,
} from "../lib/admin/site-refresh";
import type { ApiResult, FieldError } from "../lib/api/client";
import { useApp } from "./app-context";
import { formatDateTime, replaceParam } from "./common";
import { MediaThumb } from "./MediaPicker";
import {
  Button,
  Card,
  Counter,
  cx,
  Dialog,
  Field,
  Notice,
  StatusBadge,
  TextArea,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Editor logic                                                        */
/* ------------------------------------------------------------------ */

export interface ContentItem {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  updatedAt: string;
  publishedAt: string | null;
}

export interface EditorAdapter<
  T extends ContentItem,
  V extends FieldValues,
  I,
> {
  /** React Query keys: one item, and every list of this kind. */
  itemKey: string;
  listKey: string;
  listPath: string;
  editPath: string;
  editHref: (id: string) => string;
  /** What the site refresh is told changed (src/lib/admin/site-refresh.ts). */
  kind: "news" | "project";
  /** For the success dialog: "noticia" (feminine) / "proyecto". */
  noun: ContentNoun;
  /** Public page of an item, e.g. "/noticias/{slug}". */
  sitePath: (slug: string) => string;
  toForm: (item: T) => V;
  toInput: (values: V, options: { isNew: boolean }) => I;
  create: (input: I) => Promise<ApiResult<T>>;
  update: (id: string, input: I) => Promise<ApiResult<T>>;
  publish: (id: string) => Promise<ApiResult<T>>;
  unpublish: (id: string) => Promise<ApiResult<T>>;
  remove: (id: string) => Promise<ApiResult<null>>;
  fieldErrors: (
    status: number,
    errors: readonly FieldError[] | undefined,
  ) => { fields: Partial<Record<string, string>> };
  checklist: (values: V) => ChecklistItem<string>[];
}

export type Banner = {
  tone: "error" | "info";
  text: string;
} | null;
export type Busy = null | "save" | "publish" | "unpublish" | "delete";
export type Confirm = null | "unpublish" | "delete" | { leave: () => void };

const REVIEW = "Revisa los campos marcados en rojo.";

export function useContentEditor<
  T extends ContentItem,
  V extends FieldValues,
  I,
>(
  adapter: EditorAdapter<T, V, I>,
  initial: T | null,
  form: UseFormReturn<V>,
  tabs: readonly EditorTab[],
) {
  const app = useApp();
  const [tab, setTabState] = useState(() => {
    const wanted = new URLSearchParams(window.location.search).get("paso");
    return tabs.some((t) => t.id === wanted)
      ? (wanted ?? "")
      : (tabs[0]?.id ?? "");
  });
  const queryClient = useQueryClient();
  const [item, setItem] = useState(initial);
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const isNew = item === null;
  const {
    handleSubmit,
    reset,
    setError,
    getValues,
    setFocus,
    formState: { isDirty },
  } = form;

  /** Shows a step and keeps it in the URL (`?paso=`), so a reload stays. */
  function setTab(id: string) {
    setTabState(id);
    replaceParam("paso", id === tabs[0]?.id ? null : id);
  }

  /** Opens the step of a field and puts the cursor on it. */
  function reveal(field: string) {
    setTab(tabForField(tabs, field));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setFocus(field as FieldPath<V>)),
    );
  }

  // Ask before leaving with unsaved changes (in-app links and the browser).
  useEffect(() => {
    if (!isDirty || busy) {
      app.setLeaveGuard(null);
      return;
    }
    app.setLeaveGuard((proceed) => {
      setConfirm({ leave: proceed });
      return true;
    });
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      app.setLeaveGuard(null);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isDirty, busy, app]);

  /**
   * Shows a message above the form. Focus moves to it, except when a field
   * has an error: then focus stays on that field (the message is an alert).
   */
  function show(next: Banner, { focus = true } = {}) {
    setBanner(next);
    if (focus) requestAnimationFrame(() => bannerRef.current?.focus());
  }

  function markFields(fields: Partial<Record<string, string>>): boolean {
    const names = Object.keys(fields);
    for (const name of names) {
      setError(name as FieldPath<V>, {
        type: "server",
        message: fields[name] ?? "",
      });
    }
    const first = firstErrorField(tabs, names);
    if (first) reveal(first);
    return names.length > 0;
  }

  function applyProblem(result: Exclude<ApiResult<unknown>, { ok: true }>) {
    if (
      result.kind === "problem" &&
      (result.status === 409 || result.status === 422) &&
      markFields(
        adapter.fieldErrors(result.status, result.problem.errors).fields,
      )
    ) {
      show({ tone: "error", text: REVIEW }, { focus: false });
      return;
    }
    show({ tone: "error", text: problemMessage(result) });
  }

  function stored(next: T) {
    setItem(next);
    queryClient.setQueryData([adapter.itemKey, next.id], next);
    void queryClient.invalidateQueries({ queryKey: [adapter.listKey] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-counts"] });
    reset(adapter.toForm(next));
  }

  /** Saves the form; resolves to the stored item, or null on error. */
  async function save(values: V): Promise<T | null> {
    const input = adapter.toInput(values, { isNew });
    const result = item
      ? await adapter.update(item.id, input)
      : await adapter.create(input);
    if (!result.ok) {
      applyProblem(result);
      return null;
    }
    stored(result.data);
    return result.data;
  }

  function goToEditor(saved: T, flash?: string) {
    // The new item now has an address: continue on its edit page.
    app.setLeaveGuard(null);
    if (flash) app.setFlash(flash, adapter.editPath);
    app.navigate(adapter.editHref(saved.id), { replace: true });
  }

  /**
   * Opens the success dialog. A public change first refreshes the site's
   * pages for this item (and its old address when the slug changed).
   */
  function announce(
    action: EditorAction,
    saved: { slug: string; title: string },
    options: { isPublic: boolean; previousSlug?: string | null },
  ) {
    const refresh = options.isPublic
      ? refreshSite({
          kind: adapter.kind,
          slug: saved.slug,
          previousSlug:
            options.previousSlug && options.previousSlug !== saved.slug
              ? options.previousSlug
              : null,
        })
      : undefined;
    app.showSuccess(
      {
        build: (state) =>
          successNotice(action, adapter.noun, saved.title, state),
        siteHref:
          action === "deleted" || action === "unpublished"
            ? null
            : adapter.sitePath(saved.slug),
      },
      refresh,
    );
  }

  function invalid(errors: Record<string, unknown>) {
    const first = firstErrorField(tabs, Object.keys(errors));
    if (first) reveal(first);
    show({ tone: "error", text: REVIEW }, { focus: false });
  }

  async function saveValid(values: V) {
    const previousSlug = item?.slug ?? null;
    setBusy("save");
    const saved = await save(values);
    setBusy(null);
    if (!saved) return;
    setBanner(null);
    if (isNew) {
      goToEditor(saved);
      announce("created", saved, { isPublic: false });
      return;
    }
    announce("saved", saved, {
      isPublic: saved.status === "published",
      previousSlug,
    });
  }

  async function publishValid(values: V) {
    const missing = adapter
      .checklist(values)
      .filter((i) => i.required && !i.done);
    if (missing.length > 0) {
      markFields(
        Object.fromEntries(
          missing.map((i) => [i.field, "Es obligatorio para publicar."]),
        ),
      );
      show(
        {
          tone: "error",
          text: `Para publicar falta: ${missing.map((i) => i.label.toLowerCase()).join(", ")}.`,
        },
        { focus: false },
      );
      return;
    }
    setBusy("publish");
    const previousSlug = item?.slug ?? null;
    let current = item;
    if (!current || isDirty) {
      current = await save(values);
      if (!current) {
        setBusy(null);
        return;
      }
    }
    const result = await adapter.publish(current.id);
    setBusy(null);
    if (!result.ok) {
      applyProblem(result);
      if (isNew) {
        goToEditor(current, "Borrador guardado, pero no se pudo publicar.");
      }
      return;
    }
    stored(result.data);
    setBanner(null);
    if (isNew) goToEditor(result.data);
    announce("published", result.data, { isPublic: true, previousSlug });
  }

  async function unpublish() {
    if (!item) return;
    setConfirm(null);
    setBusy("unpublish");
    const result = await adapter.unpublish(item.id);
    setBusy(null);
    if (!result.ok) {
      show({ tone: "error", text: problemMessage(result) });
      return;
    }
    // Keep unsaved edits in the form: only the status changed.
    const edits = getValues();
    const dirty = isDirty;
    stored(result.data);
    if (dirty) reset(edits, { keepDefaultValues: true });
    setBanner(null);
    announce("unpublished", result.data, { isPublic: true });
  }

  async function remove() {
    if (!item) return;
    setConfirm(null);
    setBusy("delete");
    const result = await adapter.remove(item.id);
    if (!result.ok) {
      setBusy(null);
      show({ tone: "error", text: problemMessage(result) });
      return;
    }
    queryClient.removeQueries({ queryKey: [adapter.itemKey, item.id] });
    void queryClient.invalidateQueries({ queryKey: [adapter.listKey] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-counts"] });
    app.setLeaveGuard(null);
    app.navigate(adapter.listPath);
    announce("deleted", item, { isPublic: item.status === "published" });
  }

  function leave(proceed: () => void) {
    setConfirm(null);
    reset(getValues());
    proceed();
  }

  return {
    tab,
    setTab,
    reveal,
    item,
    isNew,
    status: item?.status ?? ("draft" as const),
    banner,
    bannerRef,
    busy,
    confirm,
    setConfirm,
    onSave: (event?: BaseSyntheticEvent) =>
      void handleSubmit(saveValid, invalid)(event),
    onPublish: () => void handleSubmit(publishValid, invalid)(),
    unpublish,
    remove,
    leave,
  };
}

/* ------------------------------------------------------------------ */
/* Page pieces                                                         */
/* ------------------------------------------------------------------ */

export function SectionTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-lg leading-6 font-semibold text-ink">{title}</h3>
      <p className="max-w-[65ch] text-sm leading-5 text-ink-muted">{text}</p>
    </div>
  );
}

export function EditorHeader({
  backLabel,
  listPath,
  title,
  status,
  isDirty,
  item,
  siteHref,
  busy,
  publishedLabel,
  onPublish,
  onAskUnpublish,
}: {
  backLabel: string;
  listPath: string;
  title: string;
  status: "draft" | "published";
  isDirty: boolean;
  item: ContentItem | null;
  /** Public page, shown while published. */
  siteHref: string | null;
  busy: Busy;
  /** "Publicado" / "Publicada" for the first publication date. */
  publishedLabel: string;
  onPublish: () => void;
  onAskUnpublish: () => void;
}) {
  const published = status === "published";
  const actions = (
    <>
      {published && siteHref && (
        <a
          href={siteHref}
          target="_blank"
          rel="noopener"
          className="hidden min-h-11 items-center gap-2 rounded-md px-3 text-base font-semibold text-ink no-underline hover:bg-surface-sunken hover:text-ink xl:inline-flex"
        >
          <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
          Ver en el sitio
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      )}
      <Button
        type="submit"
        variant="secondary"
        disabled={busy !== null}
        className="flex-1 px-4 lg:flex-none lg:px-5"
      >
        {busy === "save" ? (
          "Guardando…"
        ) : (
          <>
            Guardar
            <span className="sr-only sm:not-sr-only">
              {published ? " cambios" : " borrador"}
            </span>
          </>
        )}
      </Button>
      {published ? (
        <Button
          variant="secondary"
          disabled={busy !== null}
          onClick={onAskUnpublish}
          className="flex-1 px-4 lg:flex-none lg:px-5"
        >
          {busy === "unpublish" ? "Despublicando…" : "Despublicar"}
        </Button>
      ) : (
        <Button
          disabled={busy !== null}
          onClick={onPublish}
          className="flex-1 px-4 lg:flex-none lg:px-5"
        >
          {busy === "publish" ? "Publicando…" : "Publicar"}
        </Button>
      )}
    </>
  );
  return (
    <>
      <div className="flex min-w-0 flex-col gap-2">
        <a
          href={listPath}
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold"
        >
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          {backLabel}
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="editor-title"
            className="min-w-0 text-[28px] leading-9 font-semibold text-ink"
          >
            {title}
          </h2>
          <StatusBadge status={status} />
        </div>
        {item && (
          <p className="text-sm text-ink-muted">
            Última edición: {formatDateTime(item.updatedAt)}
            {item.publishedAt &&
              ` · ${publishedLabel} por primera vez el ${formatDateTime(item.publishedAt)}`}
          </p>
        )}
      </div>
      {/* The actions stay in view: a bar under the navbar on desktop and
          fixed at the bottom of the screen on phones (the form leaves room
          for it), so saving or publishing never needs scrolling back up. */}
      <div
        role="group"
        aria-label="Acciones"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:sticky lg:top-16 lg:bottom-auto lg:z-10 lg:-mx-8 lg:-mt-2 lg:border-t-0 lg:border-b lg:px-8 lg:py-3"
      >
        <p className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          <span className="truncate font-semibold text-ink">{title}</span>
          <span
            className={cx(
              "shrink-0 text-sm",
              isDirty ? "font-medium text-ink" : "text-ink-muted",
            )}
          >
            {isDirty ? "Cambios sin guardar" : item ? "Todo guardado" : ""}
          </span>
        </p>
        {actions}
      </div>
    </>
  );
}

export function BannerSlot({
  banner,
  bannerRef,
}: {
  banner: Banner;
  bannerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={bannerRef} tabIndex={-1} className="focus:outline-none">
      {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}
    </div>
  );
}

export function ChecklistCard({
  checklist,
  published,
  children,
  onGoTo,
}: {
  checklist: ChecklistItem<string>[];
  published: boolean;
  /** Shown below the card (e.g. the delete action). */
  children?: ReactNode;
  /** Pending items become links to their field (opens its step). */
  onGoTo?: (field: string) => void;
}) {
  const missing = checklist.filter((i) => i.required && !i.done);
  const n = missing.length;
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      <Card className="flex flex-col gap-4">
        <h3 className="text-lg leading-6 font-semibold text-ink">
          {published ? "Estado" : "Para publicar"}
        </h3>
        <ul className="flex flex-col gap-2">
          {checklist.map((item) => (
            <li key={item.field} className="flex items-start gap-2.5">
              {item.done ? (
                <Check
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-ink"
                />
              ) : (
                <Circle
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-ink-muted"
                />
              )}
              {!item.done && onGoTo ? (
                <button
                  type="button"
                  onClick={() => onGoTo(item.field)}
                  className="text-left text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink hover:decoration-current"
                >
                  {item.label}
                  <span className="sr-only">: pendiente, ir al campo</span>
                  {item.required ? "" : " (recomendado)"}
                </button>
              ) : (
                <span className={cx(item.done ? "text-ink" : "text-ink-muted")}>
                  {item.label}
                  <span className="sr-only">
                    {item.done ? ": listo" : ": pendiente"}
                  </span>
                  {item.required ? "" : " (recomendado)"}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-muted">
          {n === 0
            ? published
              ? "Publicado. Los cambios que guardes se ven en el sitio al momento."
              : "Listo para publicar."
            : `Falta${n === 1 ? "" : "n"} ${n} dato${n === 1 ? "" : "s"} obligatorio${n === 1 ? "" : "s"} para publicar.`}
        </p>
      </Card>
      {children}
    </aside>
  );
}

function SeoHint({
  rating,
  empty,
  ideal,
}: {
  rating: SeoLength;
  empty: string;
  ideal: string;
}) {
  if (rating === "empty") return <>{empty}</>;
  const note =
    rating === "good"
      ? "Buen largo."
      : rating === "short"
        ? "Un poco corto."
        : "Demasiado largo: Google lo cortará.";
  return (
    <>
      {note} {ideal}
    </>
  );
}

export function EmptyImage({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong px-4 py-6 font-semibold text-ink hover:bg-surface-sunken"
    >
      <ImagePlus size={24} strokeWidth={1.5} aria-hidden="true" />
      {label}
    </button>
  );
}

export function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-md text-ink hover:bg-surface-sunken disabled:opacity-40"
    >
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** A single image (cover): preview, alt text, size warning and actions. */
export function CoverChooser({
  mediaId,
  media,
  emptyLabel,
  onPick,
  onClear,
}: {
  mediaId: string | null;
  media: AdminMedia | undefined;
  emptyLabel: string;
  onPick: () => void;
  onClear: () => void;
}) {
  if (!mediaId) return <EmptyImage label={emptyLabel} onClick={onPick} />;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <MediaThumb
        media={media}
        sizes="320px"
        className="aspect-[4/3] w-full rounded-md sm:w-64"
      />
      <div className="flex flex-col gap-2">
        {media && <p className="text-sm text-ink-muted">{media.alt}</p>}
        {media && smallForCover(media) && (
          <p className="inline-flex items-start gap-1.5 text-sm text-ink">
            <TriangleAlert
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            Mide {media.width} px de ancho: puede verse borrosa en pantallas
            grandes.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onPick}>
            Cambiar
          </Button>
          <Button variant="ghost" onClick={onClear}>
            Quitar
          </Button>
        </div>
      </div>
    </div>
  );
}

/** "Google y redes sociales": preview, SEO title and description, address. */
export function SeoCard({
  noun,
  preview,
  limits,
  fields,
  errors,
  isNew,
  published,
  emptyTitleHint,
  emptyDescriptionHint,
  ogImage,
  onPickOg,
  onClearOg,
}: {
  /** "el proyecto" / "la noticia". */
  noun: string;
  preview: SearchPreviewInput;
  limits: { seoTitle: number; seoDescription: number };
  fields: {
    seoTitle: UseFormRegisterReturn;
    seoDescription: UseFormRegisterReturn;
    slug: UseFormRegisterReturn;
  };
  errors: {
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
    slug?: string | undefined;
  };
  isNew: boolean;
  published: boolean;
  emptyTitleHint: string;
  emptyDescriptionHint: string;
  ogImage: { id: string | null; media: AdminMedia | undefined };
  onPickOg: () => void;
  onClearOg: () => void;
}) {
  const shown = searchPreview(preview);
  return (
    <Card className="flex flex-col gap-5">
      <SectionTitle
        title="Google y redes sociales"
        text={`Cómo se ve ${noun} en los resultados de búsqueda y al compartirlo por WhatsApp o LinkedIn.`}
      />
      <div
        className="rounded-md border border-border bg-surface p-4"
        aria-label="Vista previa en Google"
        role="group"
      >
        <p className="mb-2 text-xs font-semibold tracking-[0.06em] text-ink-muted uppercase">
          Vista previa en Google
        </p>
        <p className="truncate text-sm text-ink-muted">{shown.url}</p>
        <p className="text-lg leading-6 font-medium text-brand">
          {shown.title}
        </p>
        <p className="text-sm leading-5 text-ink">
          {shown.description || (
            <span className="text-ink-muted">
              Escribe una descripción para Google.
            </span>
          )}
        </p>
      </div>
      <Field
        label="Título para Google"
        optional
        hint={
          <SeoHint
            rating={seoLength(preview.seoTitle, "title")}
            empty={emptyTitleHint}
            ideal="Ideal: entre 30 y 60 caracteres."
          />
        }
        {...fields.seoTitle}
        error={errors.seoTitle}
        aside={
          <Counter count={charCount(preview.seoTitle)} max={limits.seoTitle} />
        }
      />
      <TextArea
        label="Descripción para Google"
        hint={
          <SeoHint
            rating={seoLength(preview.seoDescription, "description")}
            empty={emptyDescriptionHint}
            ideal="Ideal: entre 70 y 160 caracteres."
          />
        }
        rows={3}
        {...fields.seoDescription}
        error={errors.seoDescription}
        aside={
          <Counter
            count={charCount(preview.seoDescription)}
            max={limits.seoDescription}
          />
        }
      />
      <Field
        label="Dirección de la página"
        optional={isNew}
        hint={
          isNew
            ? "Se crea sola a partir del título si la dejas vacía."
            : published
              ? "Si la cambias, los enlaces que ya se compartieron dejarán de funcionar."
              : "Solo minúsculas sin tildes, números y guiones."
        }
        placeholder={isNew ? "se-crea-del-titulo" : undefined}
        autoComplete="off"
        spellCheck={false}
        {...fields.slug}
        error={errors.slug}
        aside={
          <span className="text-sm text-ink-muted">
            emoj.cl/{preview.section}/…
          </span>
        }
      />
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-ink">
          Imagen al compartir{" "}
          <span className="font-medium text-ink-muted">(opcional)</span>
        </h4>
        <p className="text-sm text-ink-muted">
          Si no eliges una, se usa la foto de portada.
        </p>
        {ogImage.id ? (
          <div className="flex flex-wrap items-center gap-3">
            <MediaThumb
              media={ogImage.media}
              className="aspect-[1.91/1] w-48 rounded-md"
            />
            <Button variant="secondary" onClick={onPickOg}>
              Cambiar
            </Button>
            <Button variant="ghost" onClick={onClearOg}>
              Quitar
            </Button>
          </div>
        ) : (
          <div>
            <Button variant="secondary" onClick={onPickOg}>
              Elegir imagen
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Delete action, quiet and below the checklist (not at the end of a step). */
export function DeleteAction({
  label,
  text,
  busy,
  onAsk,
}: {
  label: string;
  text: string;
  busy: Busy;
  onAsk: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 px-1">
      <Button
        variant="ghost"
        disabled={busy !== null}
        onClick={onAsk}
        className="self-start px-3 text-brand hover:text-brand"
      >
        <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
        {busy === "delete" ? "Eliminando…" : label}
      </Button>
      <p className="px-3 text-sm leading-5 text-ink-muted">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps (tabs)                                                        */
/* ------------------------------------------------------------------ */

/**
 * The editor's steps as tabs (WAI-ARIA tabs pattern: arrow keys, Home and
 * End move between them). Each tab shows its number and a check when the
 * step is complete, or a mark when one of its fields has an error.
 */
export function EditorTabs({
  tabs,
  current,
  onChange,
  checklist,
  errorFields,
}: {
  tabs: readonly EditorTab[];
  current: string;
  onChange: (id: string) => void;
  checklist: readonly ChecklistItem<string>[];
  errorFields: readonly string[];
}) {
  const status = tabStatus(tabs, checklist, errorFields);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    onChange(target.id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Pasos"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
    >
      {tabs.map((t, index) => {
        const selected = t.id === current;
        const state: TabState = status[t.id] ?? "todo";
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cx(
              "relative -mb-px flex min-h-12 shrink-0 items-center gap-2.5 border-b-2 px-3 text-base font-semibold whitespace-nowrap transition-colors md:px-4",
              selected
                ? "border-brand text-ink"
                : "border-transparent text-ink-muted hover:border-border-strong hover:text-ink",
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                "grid size-6 place-items-center rounded-full text-[13px] tabular-nums",
                state === "error"
                  ? "bg-brand text-on-brand"
                  : state === "done"
                    ? "bg-surface-inverse text-ink-inverse"
                    : selected
                      ? "bg-surface-sunken text-ink"
                      : "bg-surface-sunken text-ink-muted",
              )}
            >
              {state === "done" ? (
                <Check size={14} strokeWidth={2.5} />
              ) : state === "error" ? (
                "!"
              ) : (
                index + 1
              )}
            </span>
            {t.label}
            <span className="sr-only">
              {state === "error"
                ? " (tiene campos por revisar)"
                : state === "done"
                  ? " (completo)"
                  : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One step: its fields, then a way to the previous and next steps. */
export function StepPanel({
  tabs,
  id,
  current,
  onChange,
  children,
}: {
  tabs: readonly EditorTab[];
  id: string;
  current: string;
  onChange: (id: string) => void;
  children: ReactNode;
}) {
  const index = tabs.findIndex((t) => t.id === id);
  const prev = tabs[index - 1];
  const next = tabs[index + 1];
  const go = (target: string) => {
    onChange(target);
    document.getElementById(`tab-${target}`)?.focus({ preventScroll: true });
    document
      .getElementById("editor-steps")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={id !== current}
      className="flex flex-col gap-6"
    >
      {children}
      {(prev || next) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {prev ? (
            <Button variant="ghost" onClick={() => go(prev.id)}>
              <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
              {prev.label}
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button variant="secondary" onClick={() => go(next.id)}>
              Siguiente: {next.label}
              <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Delete, unpublish and leave-without-saving confirmations. */
export function EditorDialogs({
  confirm,
  onCancel,
  itemTitle,
  published,
  noun,
  onDelete,
  onUnpublish,
  onLeave,
}: {
  confirm: Confirm;
  onCancel: () => void;
  itemTitle: string;
  published: boolean;
  /** "este proyecto" / "esta noticia". */
  noun: string;
  onDelete: () => void;
  onUnpublish: () => void;
  onLeave: (proceed: () => void) => void;
}) {
  if (confirm === "delete") {
    return (
      <Dialog
        title={`¿Eliminar ${noun}?`}
        description={
          <>
            «{itemTitle}» se borrará definitivamente
            {published ? " y dejará de verse en el sitio" : ""}. Esta acción no
            se puede deshacer.
          </>
        }
        onClose={onCancel}
        footer={
          <>
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Eliminar
            </Button>
          </>
        }
      />
    );
  }
  if (confirm === "unpublish") {
    return (
      <Dialog
        title={`¿Despublicar ${noun}?`}
        description="Dejará de verse en el sitio. Queda guardado como borrador y puedes volver a publicarlo cuando quieras."
        onClose={onCancel}
        footer={
          <>
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={onUnpublish}>Despublicar</Button>
          </>
        }
      />
    );
  }
  if (confirm !== null) {
    const proceed = confirm.leave;
    return (
      <Dialog
        title="Tienes cambios sin guardar"
        description="Si sales ahora, se perderán."
        onClose={onCancel}
        footer={
          <>
            <Button variant="danger" onClick={() => onLeave(proceed)}>
              Salir sin guardar
            </Button>
            <Button onClick={onCancel}>Seguir editando</Button>
          </>
        }
      />
    );
  }
  return null;
}
