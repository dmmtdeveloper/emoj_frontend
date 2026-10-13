/**
 * Portada: the home page hero (title, highlighted word, paragraph, both
 * buttons and the photo carousel), saved with PUT /v1/admin/home/hero.
 *
 * - Texts and buttons are checked with the API's rules as you type
 *   (src/lib/admin/home-hero-form.ts) and again on save.
 * - Photos come from the media library, in order, up to 8. On each one a
 *   click (or the arrow keys) sets the focal point: the site crops around
 *   it on every screen, and the preview shows a computer and a phone.
 * - Without photos the site keeps its three built-in photos.
 * - The action bar stays in view (under the navbar on desktop, fixed at the
 *   bottom on phones), and leaving with unsaved changes asks first.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Crosshair,
  ExternalLink,
  ImagePlus,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import builtInPhoto from "../assets/photos/agua-manos.jpg";
import type { AdminHomeHero } from "../lib/admin/api";
import { problemMessage } from "../lib/admin/errors";
import {
  addPhotos,
  errorsFromProblem,
  focusFromPoint,
  formFromHero,
  HERO_LIMITS,
  heroInput,
  moveFocus,
  sameForm,
  validateHero,
  type HeroErrors,
  type HeroForm,
  type HeroPhotoValue,
} from "../lib/admin/home-hero-form";
import { orderedIds } from "../lib/admin/media";
import { charCount } from "../lib/admin/project-form";
import { refreshSite, type SiteState } from "../lib/admin/site-refresh";
import { focusClasses, titleParts } from "../lib/content/home-hero";
import { TAGLINE } from "../lib/site";
import { adminApi } from "./api";
import { useApp } from "./app-context";
import { ErrorNotice, formatDateTime, unwrap } from "./common";
import { EmptyImage, IconButton, SectionTitle } from "./editor-kit";
import { mediaById, MediaPicker, useMediaLibrary } from "./MediaPicker";
import { EditorSkeleton } from "./skeletons";
import {
  Button,
  Card,
  Counter,
  cx,
  Dialog,
  FadeImage,
  Field,
  Notice,
  TextArea,
} from "./ui";

const HERO_KEY = ["home-hero"] as const;

interface Thumb {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export function HomeHeroEditor() {
  const query = useQuery({
    queryKey: HERO_KEY,
    queryFn: async () => unwrap(await adminApi.getHomeHero()),
  });
  if (query.isPending) return <EditorSkeleton label="Cargando la portada…" />;
  if (query.isError) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      </div>
    );
  }
  return <Editor hero={query.data} />;
}

function successText(state: SiteState | "pending" | null) {
  return {
    title: "Portada guardada",
    text:
      state === "pending"
        ? "Actualizando el sitio…"
        : state === "later"
          ? "Los cambios se verán en el inicio del sitio en unos minutos."
          : "Los cambios ya se ven en el inicio del sitio.",
    showLink: state !== "pending",
  };
}

function Editor({ hero }: { hero: AdminHomeHero }) {
  const app = useApp();
  const queryClient = useQueryClient();
  const library = useMediaLibrary();
  const [saved, setSaved] = useState<HeroForm>(() => formFromHero(hero));
  const [form, setForm] = useState<HeroForm>(saved);
  const [updatedAt, setUpdatedAt] = useState(hero.updatedAt);
  const [errors, setErrors] = useState<HeroErrors>({});
  const [banner, setBanner] = useState<{
    tone: "error" | "info";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const dirty = !sameForm(form, saved);

  // Thumbnails: the library, plus the images the API resolved for photos
  // that are not in the loaded library page (or before it loads).
  const [known] = useState(
    () =>
      new Map<string, Thumb>(
        hero.photos.flatMap((p) => (p.media ? [[p.mediaId, p.media]] : [])),
      ),
  );
  const libraryById = mediaById(library.data);
  const thumbOf = (id: string): Thumb | undefined => {
    const m = libraryById.get(id);
    if (m?.url) return m;
    return known.get(id);
  };

  // Ask before leaving with unsaved changes (in-app links and the browser).
  useEffect(() => {
    if (!dirty || busy) {
      app.setLeaveGuard(null);
      return;
    }
    app.setLeaveGuard((proceed) => {
      setLeave(() => proceed);
      return true;
    });
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      app.setLeaveGuard(null);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, busy, app]);

  /** Updates a field and rechecks it once it has shown an error. */
  function set<K extends keyof HeroForm>(key: K, value: HeroForm[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (Object.keys(errors).length > 0) setErrors(validateHero(next));
  }

  function setPhotos(photos: HeroPhotoValue[]) {
    set("photos", photos);
    setPreviewIndex((i) => Math.min(i, Math.max(0, photos.length - 1)));
  }

  function showBanner(tone: "error" | "info", text: string) {
    setBanner({ tone, text });
    requestAnimationFrame(() => bannerRef.current?.focus());
  }

  async function save() {
    const found = validateHero(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showBanner("error", "Revisa los campos marcados antes de guardar.");
      return;
    }
    setBusy(true);
    setBanner(null);
    const result = await adminApi.updateHomeHero(heroInput(form));
    setBusy(false);
    if (!result.ok) {
      if (result.kind === "problem" && result.status === 422) {
        setErrors(errorsFromProblem(result.problem.errors ?? []));
        showBanner("error", "Revisa los campos marcados antes de guardar.");
      } else {
        showBanner("error", problemMessage(result));
      }
      return;
    }
    const next = formFromHero(result.data);
    for (const p of result.data.photos) {
      if (p.media) known.set(p.mediaId, p.media);
    }
    queryClient.setQueryData(HERO_KEY, result.data);
    setSaved(next);
    setForm(next);
    setUpdatedAt(result.data.updatedAt);
    app.showSuccess(
      { build: successText, siteHref: "/" },
      refreshSite({ kind: "home", slug: "", previousSlug: null }),
    );
  }

  const photo = form.photos[previewIndex];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="mx-auto flex max-w-6xl flex-col gap-6 pb-24 lg:pb-0"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] leading-9 font-semibold text-ink">
          Portada del sitio
        </h2>
        <p className="max-w-[65ch] text-ink-muted">
          Lo primero que se ve al entrar a emoj.cl: el título, el párrafo, los
          botones y las fotos que van cambiando.
        </p>
        <p className="text-sm text-ink-muted">
          Última edición: {formatDateTime(updatedAt)}
        </p>
      </div>

      <div
        role="group"
        aria-label="Acciones"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:sticky lg:top-16 lg:bottom-auto lg:z-10 lg:-mx-8 lg:-mt-2 lg:border-t-0 lg:border-b lg:px-8 lg:py-3"
      >
        <p className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          <span className="truncate font-semibold text-ink">Portada</span>
          <span
            className={cx(
              "shrink-0 text-sm",
              dirty ? "font-medium text-ink" : "text-ink-muted",
            )}
          >
            {dirty ? "Cambios sin guardar" : "Todo guardado"}
          </span>
        </p>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="hidden min-h-11 items-center gap-2 rounded-md px-3 text-base font-semibold text-ink no-underline hover:bg-surface-sunken hover:text-ink xl:inline-flex"
        >
          <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
          Ver en el sitio
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
        <Button
          variant="ghost"
          disabled={!dirty || busy}
          onClick={() => {
            setForm(saved);
            setErrors({});
            setBanner(null);
            setPreviewIndex(0);
          }}
          className="shrink-0 px-3 lg:px-4"
        >
          <span>
            Descartar
            <span className="sr-only sm:not-sr-only"> cambios</span>
          </span>
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="flex-1 px-4 lg:flex-none lg:px-5"
        >
          {busy ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      <div ref={bannerRef} tabIndex={-1} className="focus:outline-none">
        {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <TextsCard form={form} errors={errors} set={set} />
          <ButtonsCard form={form} errors={errors} set={set} />
          <PhotosCard
            photos={form.photos}
            error={errors.photos}
            thumbOf={thumbOf}
            previewIndex={previewIndex}
            onPreview={setPreviewIndex}
            onAdd={() => setPicking(true)}
            onChange={setPhotos}
          />
        </div>
        <div className="flex flex-col gap-3 lg:sticky lg:top-36">
          <HeroPreview
            form={form}
            photo={photo}
            thumb={photo ? thumbOf(photo.mediaId) : undefined}
            index={previewIndex}
          />
        </div>
      </div>

      {picking && (
        <MediaPicker
          title="Elegir fotos para la portada"
          purpose="hero"
          multiple
          selected={form.photos.map((p) => p.mediaId)}
          onClose={() => setPicking(false)}
          onConfirm={(ids) => {
            setPicking(false);
            // The picker returns the whole selection: keep the photos still
            // chosen (with their focal points), then add the new ones.
            const kept = form.photos.filter((p) => ids.includes(p.mediaId));
            const { photos, skipped } = addPhotos(kept, ids);
            setPhotos(photos);
            if (skipped > 0) {
              showBanner(
                "info",
                `La portada admite hasta ${HERO_LIMITS.photos} fotos: ${skipped === 1 ? "una quedó fuera" : `${skipped} quedaron fuera`}.`,
              );
            }
          }}
        />
      )}

      {leave && (
        <Dialog
          title="Tienes cambios sin guardar"
          description="Si sales ahora, se perderán."
          onClose={() => setLeave(null)}
          footer={
            <>
              <Button
                variant="danger"
                onClick={() => {
                  const proceed = leave;
                  setLeave(null);
                  app.setLeaveGuard(null);
                  proceed();
                }}
              >
                Salir sin guardar
              </Button>
              <Button onClick={() => setLeave(null)}>Seguir editando</Button>
            </>
          }
        />
      )}
    </form>
  );
}

type Setter = <K extends keyof HeroForm>(key: K, value: HeroForm[K]) => void;

function TextsCard({
  form,
  errors,
  set,
}: {
  form: HeroForm;
  errors: HeroErrors;
  set: Setter;
}) {
  // Words of the title, to pick the highlight without retyping it.
  const words = [
    ...new Set(
      form.title
        .split(/\s+/)
        .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
        .filter((w) => charCount(w) >= 3),
    ),
  ];
  const highlight = form.highlight.trim();
  return (
    <Card className="flex flex-col gap-5">
      <SectionTitle
        title="Textos"
        text="Se leen sobre las fotos. El título va en grande, con una palabra destacada en verde."
      />
      <Field
        label="Título"
        value={form.title}
        error={errors.title}
        aside={
          <Counter count={charCount(form.title)} max={HERO_LIMITS.title} />
        }
        onChange={(e) => set("title", e.target.value)}
      />
      <div className="flex flex-col gap-2">
        <Field
          label="Palabra destacada"
          optional
          value={form.highlight}
          error={errors.highlight}
          hint="Debe aparecer tal cual en el título. Déjala vacía para no destacar ninguna."
          aside={
            <Counter
              count={charCount(form.highlight)}
              max={HERO_LIMITS.highlight}
            />
          }
          onChange={(e) => set("highlight", e.target.value)}
        />
        {words.length > 0 && (
          <div
            role="group"
            aria-label="Elegir una palabra del título"
            className="flex flex-wrap gap-2"
          >
            {words.map((word) => (
              <button
                key={word}
                type="button"
                aria-pressed={highlight === word}
                onClick={() => set("highlight", highlight === word ? "" : word)}
                className={cx(
                  "min-h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                  highlight === word
                    ? "border-brand bg-brand text-on-brand"
                    : "border-border-strong bg-surface-raised text-ink hover:bg-surface-sunken",
                )}
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>
      <TextArea
        label="Párrafo"
        value={form.lead}
        error={errors.lead}
        rows={4}
        aside={<Counter count={charCount(form.lead)} max={HERO_LIMITS.lead} />}
        onChange={(e) => set("lead", e.target.value)}
      />
    </Card>
  );
}

const HREF_HINT =
  "Una página del sitio (/contacto, /proyectos), un enlace https://, mailto: o tel:.";

function ButtonsCard({
  form,
  errors,
  set,
}: {
  form: HeroForm;
  errors: HeroErrors;
  set: Setter;
}) {
  return (
    <Card className="flex flex-col gap-5">
      <SectionTitle
        title="Botones"
        text="El botón principal va relleno; el secundario es un enlace con flecha a su lado."
      />
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-base font-semibold text-ink">
          Botón principal
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Texto"
            value={form.primaryLabel}
            error={errors.primaryLabel}
            aside={
              <Counter
                count={charCount(form.primaryLabel)}
                max={HERO_LIMITS.label}
              />
            }
            onChange={(e) => set("primaryLabel", e.target.value)}
          />
          <Field
            label="Enlace"
            value={form.primaryHref}
            error={errors.primaryHref}
            hint={HREF_HINT}
            inputMode="url"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => set("primaryHref", e.target.value)}
          />
        </div>
      </fieldset>
      <div className="border-t border-border pt-5">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-base font-semibold text-ink">
            Enlace secundario{" "}
            <span className="font-medium text-ink-muted">(opcional)</span>
          </legend>
          <p className="-mt-4 text-sm text-ink-muted">
            Deja el texto y el enlace vacíos para ocultarlo.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Texto"
              value={form.secondaryLabel}
              error={errors.secondaryLabel}
              aside={
                <Counter
                  count={charCount(form.secondaryLabel)}
                  max={HERO_LIMITS.label}
                />
              }
              onChange={(e) => set("secondaryLabel", e.target.value)}
            />
            <Field
              label="Enlace"
              value={form.secondaryHref}
              error={errors.secondaryHref}
              hint={HREF_HINT}
              inputMode="url"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => set("secondaryHref", e.target.value)}
            />
          </div>
        </fieldset>
      </div>
    </Card>
  );
}

function PhotosCard({
  photos,
  error,
  thumbOf,
  previewIndex,
  onPreview,
  onAdd,
  onChange,
}: {
  photos: HeroPhotoValue[];
  error: string | undefined;
  thumbOf: (id: string) => Thumb | undefined;
  previewIndex: number;
  onPreview: (index: number) => void;
  onAdd: () => void;
  onChange: (photos: HeroPhotoValue[]) => void;
}) {
  const full = photos.length >= HERO_LIMITS.photos;
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          title="Fotos"
          text="Cambian solas cada 6 segundos, en este orden. En cada foto, toca lo más importante: el recorte lo mantiene a la vista en computadores y celulares."
        />
        {photos.length > 0 && (
          <Button variant="secondary" onClick={onAdd} disabled={full}>
            <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />
            Agregar fotos
          </Button>
        )}
      </div>
      {error && <p className="text-sm font-semibold text-brand">{error}</p>}
      {photos.length === 0 ? (
        <div className="flex flex-col gap-3">
          <Notice tone="info">
            Sin fotos elegidas, el inicio muestra las tres fotos de siempre
            (agua, estación de bombeo y vista aérea).
          </Notice>
          <EmptyImage label="Elegir fotos para la portada" onClick={onAdd} />
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {photos.length} de {HERO_LIMITS.photos} fotos
            {full && " (máximo alcanzado)"}
          </p>
          <ol className="grid gap-4 sm:grid-cols-2">
            {photos.map((photo, index) => {
              const ids = photos.map((p) => p.mediaId);
              const move = (action: "up" | "down" | "remove") => {
                const order = orderedIds(ids, photo.mediaId, action);
                onChange(
                  order.flatMap((id) => photos.filter((p) => p.mediaId === id)),
                );
                if (action !== "remove") {
                  onPreview(index + (action === "up" ? -1 : 1));
                }
              };
              const thumb = thumbOf(photo.mediaId);
              const name = `foto ${index + 1}`;
              return (
                <li
                  key={photo.mediaId}
                  className={cx(
                    "flex flex-col overflow-hidden rounded-md border",
                    index === previewIndex
                      ? "border-brand ring-2 ring-brand"
                      : "border-border",
                  )}
                >
                  <FocusPicker
                    photo={photo}
                    thumb={thumb}
                    name={name}
                    onFocus={() => onPreview(index)}
                    onChange={(point) =>
                      onChange(
                        photos.map((p) =>
                          p.mediaId === photo.mediaId
                            ? { ...p, focusX: point.x, focusY: point.y }
                            : p,
                        ),
                      )
                    }
                  />
                  <div className="flex flex-col gap-1 px-3 pt-2">
                    <p className="line-clamp-2 text-sm text-ink">
                      {thumb?.alt ?? "Imagen no disponible"}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-1 p-1">
                    <span className="px-2 text-sm text-ink-muted tabular-nums">
                      {index + 1}
                    </span>
                    <div className="flex">
                      <IconButton
                        label={`Mover ${name} antes`}
                        disabled={index === 0}
                        onClick={() => move("up")}
                      >
                        <ArrowUp size={16} strokeWidth={1.75} />
                      </IconButton>
                      <IconButton
                        label={`Mover ${name} después`}
                        disabled={index === photos.length - 1}
                        onClick={() => move("down")}
                      >
                        <ArrowDown size={16} strokeWidth={1.75} />
                      </IconButton>
                      <IconButton
                        label={`Quitar ${name} de la portada`}
                        onClick={() => move("remove")}
                      >
                        <X size={16} strokeWidth={1.75} />
                      </IconButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Card>
  );
}

/**
 * The whole photo, uncropped, with a marker on its focal point. A click or
 * tap moves the marker there; the arrow keys move it in 5% steps (20% with
 * Shift).
 */
function FocusPicker({
  photo,
  thumb,
  name,
  onFocus,
  onChange,
}: {
  photo: HeroPhotoValue;
  thumb: Thumb | undefined;
  name: string;
  onFocus: () => void;
  onChange: (point: { x: number; y: number }) => void;
}) {
  const hintId = useId();
  const at = { x: photo.focusX, y: photo.focusY };
  if (!thumb?.url) {
    return (
      <div className="grid aspect-[4/3] place-items-center bg-surface-sunken p-4 text-center text-sm text-ink-muted">
        Esta imagen no está disponible. Quítala o elige otra.
      </div>
    );
  }

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    // A keyboard "click" (Enter/Space) has no pointer position: keep it.
    if (event.detail === 0) return;
    onChange(focusFromPoint(rect, event.clientX, event.clientY));
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const next = moveFocus(at, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    onChange(next);
  }

  return (
    <div className="relative bg-surface-sunken">
      <FadeImage
        src={thumb.url}
        alt=""
        width={thumb.width}
        height={thumb.height}
        sizes="(min-width: 640px) 320px, 100vw"
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
      <button
        type="button"
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onPointerDown={onFocus}
        aria-describedby={hintId}
        className="group absolute inset-0 cursor-crosshair focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-focus-ring"
      >
        <span className="sr-only">
          Punto de enfoque de la {name}: {at.x}% desde la izquierda, {at.y}%
          desde arriba.
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-sand-50 bg-plum-950/40 text-sand-50 shadow-(--shadow-md) transition-[left,top] duration-200"
          style={{ left: `${at.x}%`, top: `${at.y}%` }}
        >
          <Crosshair size={20} strokeWidth={2} />
        </span>
      </button>
      <p id={hintId} className="sr-only">
        Haz clic en lo más importante de la foto o usa las flechas para mover el
        punto.
      </p>
    </div>
  );
}

/** The hero as the site shows it, on a computer and on a phone. */
function HeroPreview({
  form,
  photo,
  thumb,
  index,
}: {
  form: HeroForm;
  photo: HeroPhotoValue | undefined;
  thumb: Thumb | undefined;
  index: number;
}) {
  const parts = titleParts(form.title, form.highlight.trim());
  const src = photo ? thumb?.url : builtInPhoto.src;
  const focus = photo ? focusClasses(photo.focusX, photo.focusY) : "";
  const secondary = form.secondaryLabel.trim();
  const title = (
    <>
      {parts.before}
      {parts.highlight && (
        <em className="font-medium text-sage-300">{parts.highlight}</em>
      )}
      {parts.after}
    </>
  );
  const image = src && (
    <img
      src={src}
      alt=""
      className={cx(
        "absolute inset-0 h-full w-full object-cover",
        photo ? "object-focus" : "object-[60%_center]",
      )}
    />
  );

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg leading-6 font-semibold text-ink">
          Vista previa
        </h3>
        <p className="text-sm text-ink-muted">
          {photo
            ? `Foto ${index + 1}, en un computador y en un celular.`
            : "Con las fotos de siempre."}
        </p>
      </div>

      {/* Computer: text on the left over a side veil. */}
      <div
        className={cx(
          "@container relative isolate aspect-[16/10] overflow-hidden rounded-md bg-plum-950 text-sand-50",
          focus,
        )}
      >
        {image}
        <div className="absolute inset-0 bg-plum-950/20" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-linear-to-r from-plum-950/80 via-plum-950/40 via-40% to-transparent to-70%"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-center gap-[2.2cqw] px-[7cqw]">
          <p className="font-data text-[1.6cqw] leading-none font-medium tracking-[0.1em] text-sand-300 uppercase">
            {TAGLINE}
          </p>
          <p className="max-w-[15ch] text-[5.2cqw] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
            {title}
          </p>
          <p className="line-clamp-3 max-w-[46ch] text-[1.9cqw] leading-[1.45] text-sand-100">
            {form.lead}
          </p>
          <div className="flex items-center gap-[3cqw] pt-[0.8cqw]">
            <span className="rounded-[0.8cqw] bg-sand-50 px-[2.6cqw] py-[1.3cqw] text-[1.7cqw] leading-none font-semibold text-plum-950">
              {form.primaryLabel || "Botón"}
            </span>
            {secondary && (
              <span className="inline-flex items-center gap-[0.8cqw] text-[1.7cqw] font-semibold">
                {secondary}
                <ArrowRight className="size-[2cqw]" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Phone: text at the foot over a bottom veil. */}
      <div
        className={cx(
          "@container relative isolate mx-auto aspect-[9/19] w-[56%] overflow-hidden rounded-[14px] border-4 border-ink bg-plum-950 text-sand-50",
          focus,
        )}
      >
        {image}
        <div
          className="absolute inset-0 bg-linear-to-t from-plum-950/90 via-plum-950/45 via-55% to-plum-950/25"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-end gap-[3.5cqw] p-[6cqw] pb-[9cqw]">
          <p className="font-data text-[3.2cqw] leading-none font-medium tracking-[0.1em] text-sand-300 uppercase">
            {TAGLINE}
          </p>
          <p className="text-[10cqw] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
            {title}
          </p>
          <p className="line-clamp-4 text-[4.4cqw] leading-[1.45] text-sand-100">
            {form.lead}
          </p>
          <span className="mt-[1cqw] rounded-[2cqw] bg-sand-50 py-[3cqw] text-center text-[4cqw] leading-none font-semibold text-plum-950">
            {form.primaryLabel || "Botón"}
          </span>
          {secondary && (
            <span className="inline-flex items-center gap-[1.5cqw] text-[4cqw] font-semibold">
              {secondary}
              <ArrowRight className="size-[4.4cqw]" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
