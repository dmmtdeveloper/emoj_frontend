/**
 * Project editor (new and existing). The form follows the API rules
 * (src/lib/admin/project-form.ts) and keeps a checklist of what publishing
 * needs. Saving keeps the status; Publicar / Despublicar change it, and any
 * change to published content rebuilds the public site (navbar indicator).
 * Leaving with unsaved changes asks first.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Circle,
  ExternalLink,
  ImagePlus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import type { AdminProject } from "../lib/admin/api";
import { problemMessage } from "../lib/admin/errors";
import { orderedIds, smallForCover } from "../lib/admin/media";
import {
  charCount,
  CHILE_REGIONS,
  emptyProjectForm,
  formErrorsFromProblem,
  formToProjectInput,
  PROJECT_LIMITS,
  projectFormSchema,
  projectToForm,
  publishChecklist,
  type ProjectField,
  type ProjectFormValues,
} from "../lib/admin/project-form";
import { searchPreview, seoLength, type SeoLength } from "../lib/admin/seo";
import type { ApiResult } from "../lib/api/client";
import { SERVICE_SLUGS } from "../lib/services";
import { adminApi } from "./api";
import { useApp } from "./app-context";
import { ErrorNotice, formatDateTime, unwrap } from "./common";
import {
  mediaById,
  MediaPicker,
  MediaThumb,
  useMediaLibrary,
} from "./MediaPicker";
import { editProjectHref } from "./projects";
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

const LIST_PATH = "/admin/proyectos";

type Banner = { tone: "success" | "error" | "info"; text: string } | null;
type Busy = null | "save" | "publish" | "unpublish" | "delete";
type Confirm = null | "unpublish" | "delete" | { leave: () => void };
type Picker = null | "cover" | "gallery" | "og";

export function ProjectEditor({
  id,
  serviceTitles,
}: {
  id: string | null;
  serviceTitles: Record<string, string>;
}) {
  const query = useQuery({
    queryKey: ["project", id],
    queryFn: async () => unwrap(await adminApi.getProject(id ?? "")),
    enabled: id !== null && id !== "",
  });

  if (id === "") {
    return (
      <Notice tone="error">
        Falta el proyecto a editar. <a href={LIST_PATH}>Vuelve a la lista</a>.
      </Notice>
    );
  }
  if (id !== null && query.error) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
        <a href={LIST_PATH}>Volver a los proyectos</a>
      </div>
    );
  }
  if (id !== null && !query.data) {
    return (
      <p role="status" className="text-ink-muted">
        Cargando el proyecto…
      </p>
    );
  }
  return (
    <EditorForm project={query.data ?? null} serviceTitles={serviceTitles} />
  );
}

function EditorForm({
  project: initial,
  serviceTitles,
}: {
  project: AdminProject | null;
  serviceTitles: Record<string, string>;
}) {
  const app = useApp();
  const queryClient = useQueryClient();
  const library = useMediaLibrary();
  const media = useMemo(() => mediaById(library.data), [library.data]);
  const [project, setProject] = useState(initial);
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const isNew = project === null;
  const schema = useMemo(() => projectFormSchema(new Date()), []);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ? projectToForm(initial) : emptyProjectForm(),
    mode: "onTouched",
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = form;
  const values = useWatch({ control }) as ProjectFormValues;
  const checklist = publishChecklist(values);
  const missing = checklist.filter((i) => i.required && !i.done);

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

  /** Puts the API's field errors on the form; returns true if any matched. */
  function applyProblem(result: Exclude<ApiResult<unknown>, { ok: true }>) {
    if (
      result.kind === "problem" &&
      (result.status === 409 || result.status === 422)
    ) {
      const { fields } = formErrorsFromProblem(
        result.status,
        result.problem.errors,
      );
      const names = Object.keys(fields) as ProjectField[];
      names.forEach((name, i) =>
        setError(
          name as FieldPath<ProjectFormValues>,
          { type: "server", message: fields[name] ?? "" },
          { shouldFocus: i === 0 },
        ),
      );
      if (names.length > 0) {
        show(
          { tone: "error", text: "Revisa los campos marcados en rojo." },
          { focus: false },
        );
        return;
      }
    }
    show({ tone: "error", text: problemMessage(result) });
  }

  function stored(next: AdminProject) {
    setProject(next);
    queryClient.setQueryData(["project", next.id], next);
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-counts"] });
    reset(projectToForm(next));
  }

  /** Saves the form; resolves to the stored project, or null on error. */
  async function save(formValues: ProjectFormValues) {
    const input = formToProjectInput(formValues, { isNew });
    const result = project
      ? await adminApi.updateProject(project.id, input)
      : await adminApi.createProject(input);
    if (!result.ok) {
      applyProblem(result);
      return null;
    }
    stored(result.data);
    return result.data;
  }

  function goToEditor(saved: AdminProject, message: string) {
    // The new project now has an address: continue on its edit page.
    app.setLeaveGuard(null);
    app.setFlash(message, "/admin/proyectos/editar");
    app.navigate(editProjectHref(saved.id), { replace: true });
  }

  function invalid() {
    show(
      { tone: "error", text: "Revisa los campos marcados en rojo." },
      { focus: false },
    );
  }

  async function saveValid(formValues: ProjectFormValues) {
    setBusy("save");
    const saved = await save(formValues);
    setBusy(null);
    if (!saved) return;
    if (isNew) {
      goToEditor(saved, "Borrador guardado.");
      return;
    }
    if (saved.status === "published") {
      app.markRebuild();
      show({
        tone: "success",
        text: "Cambios guardados. El sitio se actualiza en unos 2 minutos.",
      });
    } else {
      show({ tone: "success", text: "Borrador guardado." });
    }
  }

  async function publishValid(formValues: ProjectFormValues) {
    if (missing.length > 0) {
      missing.forEach((item, i) =>
        setError(
          item.field as FieldPath<ProjectFormValues>,
          { type: "publish", message: "Es obligatorio para publicar." },
          { shouldFocus: i === 0 },
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
    let current = project;
    if (!current || isDirty) {
      current = await save(formValues);
      if (!current) {
        setBusy(null);
        return;
      }
    }
    const result = await adminApi.publishProject(current.id);
    setBusy(null);
    if (!result.ok) {
      applyProblem(result);
      if (isNew)
        goToEditor(current, "Borrador guardado, pero no se pudo publicar.");
      return;
    }
    stored(result.data);
    app.markRebuild();
    const text = "Proyecto publicado. Aparecerá en el sitio en unos 2 minutos.";
    if (isNew) goToEditor(result.data, text);
    else show({ tone: "success", text });
  }

  function onSave(event?: React.BaseSyntheticEvent) {
    void handleSubmit(saveValid, invalid)(event);
  }

  function onPublish() {
    void handleSubmit(publishValid, invalid)();
  }

  async function onUnpublish() {
    if (!project) return;
    setConfirm(null);
    setBusy("unpublish");
    const result = await adminApi.unpublishProject(project.id);
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
    app.markRebuild();
    show({
      tone: "success",
      text: "Proyecto despublicado. Dejará de verse en el sitio en unos 2 minutos.",
    });
  }

  async function onDelete() {
    if (!project) return;
    setConfirm(null);
    setBusy("delete");
    const result = await adminApi.deleteProject(project.id);
    if (!result.ok) {
      setBusy(null);
      show({ tone: "error", text: problemMessage(result) });
      return;
    }
    if (project.status === "published") app.markRebuild();
    queryClient.removeQueries({ queryKey: ["project", project.id] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-counts"] });
    app.setLeaveGuard(null);
    app.setFlash(`Se eliminó «${project.title}».`, LIST_PATH);
    app.navigate(LIST_PATH);
  }

  const status = project?.status ?? "draft";
  const published = status === "published";
  const title =
    values.title.trim() || (isNew ? "Nuevo proyecto" : "Sin nombre");
  const preview = searchPreview({
    section: "proyectos",
    slug: values.slug,
    title: values.title,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    fallbackDescription: values.summary,
  });
  const cover = values.coverMediaId
    ? media.get(values.coverMediaId)
    : undefined;
  const ogImage = values.ogImageMediaId
    ? media.get(values.ogImageMediaId)
    : undefined;

  return (
    <form
      noValidate
      onSubmit={onSave}
      className="mx-auto flex max-w-6xl flex-col gap-6"
      aria-labelledby="editor-title"
    >
      {/* Title and actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <a
            href={LIST_PATH}
            className="inline-flex items-center gap-1.5 self-start text-sm font-semibold"
          >
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Proyectos
          </a>
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="editor-title"
              className="min-w-0 text-[28px] leading-9 font-semibold text-ink"
            >
              {title}
            </h2>
            <StatusBadge status={status} />
            {isDirty && (
              <span className="text-sm text-ink-muted">
                Cambios sin guardar
              </span>
            )}
          </div>
          {project && (
            <p className="text-sm text-ink-muted">
              Última edición: {formatDateTime(project.updatedAt)}
              {project.publishedAt &&
                ` · Publicado por primera vez el ${formatDateTime(project.publishedAt)}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap">
          {published && project && (
            <a
              href={`/proyectos/${project.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-base font-semibold text-ink no-underline hover:bg-surface-sunken hover:text-ink"
            >
              <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
              Ver en el sitio
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          )}
          <Button type="submit" variant="secondary" disabled={busy !== null}>
            {busy === "save"
              ? "Guardando…"
              : published
                ? "Guardar cambios"
                : "Guardar borrador"}
          </Button>
          {published ? (
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => setConfirm("unpublish")}
            >
              {busy === "unpublish" ? "Despublicando…" : "Despublicar"}
            </Button>
          ) : (
            <Button disabled={busy !== null} onClick={onPublish}>
              {busy === "publish" ? "Publicando…" : "Publicar"}
            </Button>
          )}
        </div>
      </div>

      <div ref={bannerRef} tabIndex={-1} className="focus:outline-none">
        {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Datos */}
          <Card className="flex flex-col gap-5">
            <SectionTitle
              title="Datos del proyecto"
              text="Lo que aparece en la ficha y en la lista de proyectos."
            />
            <Field
              label="Nombre del proyecto"
              {...register("title")}
              error={errors.title?.message}
              aside={
                <Counter
                  count={charCount(values.title)}
                  max={PROJECT_LIMITS.title}
                />
              }
            />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="Mandante"
                optional
                hint="Quién encargó el proyecto. Ej.: Dirección de Obras Hidráulicas."
                {...register("client")}
                error={errors.client?.message}
              />
              <Field
                label="Año"
                optional
                inputMode="numeric"
                autoComplete="off"
                hint="Déjalo vacío si no lo sabes."
                {...register("year")}
                error={errors.year?.message}
                className="md:max-w-40"
              />
              <Field
                label="Ubicación"
                optional
                hint="Comuna o localidad. Ej.: Limache."
                {...register("location")}
                error={errors.location?.message}
              />
              <RegionSelect
                value={values.region}
                error={errors.region?.message}
                registration={register("region")}
              />
            </div>
            <ServicesField
              control={control}
              serviceTitles={serviceTitles}
              error={errors.services?.message}
            />
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                {...register("featured")}
                className="mt-1 size-5 accent-brand"
              />
              <span>
                <span className="font-semibold text-ink">
                  Destacar en la página de inicio
                </span>
                <span className="block text-sm text-ink-muted">
                  Los proyectos destacados aparecen primero en la portada del
                  sitio.
                </span>
              </span>
            </label>
          </Card>

          {/* Fotos */}
          <Card className="flex flex-col gap-6">
            <SectionTitle
              title="Fotos"
              text="La portada encabeza la ficha y la tarjeta del proyecto. La galería se muestra en el orden que definas."
            />
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-ink">
                Foto de portada{" "}
                <span className="font-medium text-ink-muted">
                  (recomendada)
                </span>
              </h4>
              {values.coverMediaId ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <MediaThumb
                    media={cover}
                    sizes="320px"
                    className="aspect-[4/3] w-full rounded-md sm:w-64"
                  />
                  <div className="flex flex-col gap-2">
                    {cover && (
                      <p className="text-sm text-ink-muted">{cover.alt}</p>
                    )}
                    {cover && smallForCover(cover) && (
                      <p className="inline-flex items-start gap-1.5 text-sm text-ink">
                        <TriangleAlert
                          size={16}
                          strokeWidth={1.75}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0"
                        />
                        Mide {cover.width} px de ancho: puede verse borrosa en
                        pantallas grandes.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setPicker("cover")}
                      >
                        Cambiar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setValue("coverMediaId", null, { shouldDirty: true })
                        }
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyImage
                  label="Elegir foto de portada"
                  onClick={() => setPicker("cover")}
                />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-ink">
                  Galería{" "}
                  <span className="font-medium text-ink-muted">
                    ({values.gallery.length}{" "}
                    {values.gallery.length === 1 ? "foto" : "fotos"})
                  </span>
                </h4>
                {values.gallery.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => setPicker("gallery")}
                  >
                    <ImagePlus
                      size={18}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    Agregar fotos
                  </Button>
                )}
              </div>
              {errors.gallery?.message && (
                <p className="text-sm font-semibold text-brand">
                  {errors.gallery.message}
                </p>
              )}
              {values.gallery.length === 0 ? (
                <EmptyImage
                  label="Agregar fotos a la galería"
                  onClick={() => setPicker("gallery")}
                />
              ) : (
                <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {values.gallery.map((mediaId, index) => {
                    const item = media.get(mediaId);
                    const move = (action: "up" | "down" | "remove") =>
                      setValue(
                        "gallery",
                        orderedIds(values.gallery, mediaId, action),
                        { shouldDirty: true },
                      );
                    const name = `foto ${index + 1}`;
                    return (
                      <li
                        key={mediaId}
                        className="flex flex-col overflow-hidden rounded-md border border-border"
                      >
                        <MediaThumb
                          media={item}
                          className="aspect-[4/3] w-full"
                        />
                        <div className="flex items-center justify-between gap-1 p-1">
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
                              disabled={index === values.gallery.length - 1}
                              onClick={() => move("down")}
                            >
                              <ArrowDown size={16} strokeWidth={1.75} />
                            </IconButton>
                            <IconButton
                              label={`Quitar ${name} de la galería`}
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
              )}
            </div>
          </Card>

          {/* Contenido */}
          <Card className="flex flex-col gap-5">
            <SectionTitle
              title="Contenido"
              text="Escribe en frases cortas y en lenguaje simple. Puedes dejar en blanco lo que no aplique."
            />
            <TextArea
              label="Resumen"
              hint="Dos o tres frases sobre qué se hizo. Aparece en la lista de proyectos. Obligatorio para publicar."
              rows={3}
              {...register("summary")}
              error={errors.summary?.message}
              aside={
                <Counter
                  count={charCount(values.summary)}
                  max={PROJECT_LIMITS.summary}
                />
              }
            />
            <TextArea
              label="El desafío"
              optional
              hint="¿Qué problema o necesidad tenía el mandante?"
              rows={5}
              {...register("challenge")}
              error={errors.challenge?.message}
            />
            <TextArea
              label="La solución"
              optional
              hint="¿Qué diseñó o hizo EMOJ?"
              rows={5}
              {...register("solution")}
              error={errors.solution?.message}
            />
            <TextArea
              label="El resultado"
              optional
              hint="¿Qué se logró? Si puedes, con cifras (metros, caudal, plazos)."
              rows={5}
              {...register("result")}
              error={errors.result?.message}
            />
          </Card>

          {/* SEO */}
          <Card className="flex flex-col gap-5">
            <SectionTitle
              title="Google y redes sociales"
              text="Cómo se ve el proyecto en los resultados de búsqueda y al compartirlo por WhatsApp o LinkedIn."
            />
            <div
              className="rounded-md border border-border bg-surface p-4"
              aria-label="Vista previa en Google"
              role="group"
            >
              <p className="mb-2 text-xs font-semibold tracking-[0.06em] text-ink-muted uppercase">
                Vista previa en Google
              </p>
              <p className="truncate text-sm text-ink-muted">{preview.url}</p>
              <p className="text-lg leading-6 font-medium text-brand">
                {preview.title}
              </p>
              <p className="text-sm leading-5 text-ink">
                {preview.description || (
                  <span className="text-ink-muted">
                    Escribe un resumen o una descripción para Google.
                  </span>
                )}
              </p>
            </div>
            <Field
              label="Título para Google"
              optional
              hint={
                <SeoHint
                  rating={seoLength(values.seoTitle, "title")}
                  empty="Si lo dejas vacío se usa el nombre del proyecto."
                  ideal="Ideal: entre 30 y 60 caracteres."
                />
              }
              {...register("seoTitle")}
              error={errors.seoTitle?.message}
              aside={
                <Counter
                  count={charCount(values.seoTitle)}
                  max={PROJECT_LIMITS.seoTitle}
                />
              }
            />
            <TextArea
              label="Descripción para Google"
              hint={
                <SeoHint
                  rating={seoLength(values.seoDescription, "description")}
                  empty="Obligatoria para publicar. Resume el proyecto e incluye el servicio y el lugar."
                  ideal="Ideal: entre 70 y 160 caracteres."
                />
              }
              rows={3}
              {...register("seoDescription")}
              error={errors.seoDescription?.message}
              aside={
                <Counter
                  count={charCount(values.seoDescription)}
                  max={PROJECT_LIMITS.seoDescription}
                />
              }
            />
            <Field
              label="Dirección de la página"
              optional={isNew}
              hint={
                isNew
                  ? "Se crea sola a partir del nombre si la dejas vacía."
                  : published
                    ? "Si la cambias, los enlaces que ya se compartieron dejarán de funcionar."
                    : "Solo minúsculas sin tildes, números y guiones."
              }
              placeholder={isNew ? "se-crea-del-nombre" : undefined}
              autoComplete="off"
              spellCheck={false}
              {...register("slug")}
              error={errors.slug?.message}
              aside={
                <span className="text-sm text-ink-muted">
                  emoj.cl/proyectos/…
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
              {values.ogImageMediaId ? (
                <div className="flex flex-wrap items-center gap-3">
                  <MediaThumb
                    media={ogImage}
                    className="aspect-[1.91/1] w-48 rounded-md"
                  />
                  <Button variant="secondary" onClick={() => setPicker("og")}>
                    Cambiar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setValue("ogImageMediaId", null, { shouldDirty: true })
                    }
                  >
                    Quitar
                  </Button>
                </div>
              ) : (
                <div>
                  <Button variant="secondary" onClick={() => setPicker("og")}>
                    Elegir imagen
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {!isNew && (
            <Card className="flex flex-col gap-3">
              <SectionTitle
                title="Eliminar proyecto"
                text="Se borra del panel y, si está publicado, del sitio. Las fotos siguen en la biblioteca."
              />
              <div>
                <Button
                  variant="danger"
                  disabled={busy !== null}
                  onClick={() => setConfirm("delete")}
                >
                  <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
                  {busy === "delete" ? "Eliminando…" : "Eliminar proyecto"}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Checklist */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
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
                  <span
                    className={cx(item.done ? "text-ink" : "text-ink-muted")}
                  >
                    {item.label}
                    <span className="sr-only">
                      {item.done ? ": listo" : ": pendiente"}
                    </span>
                    {item.required ? "" : " (recomendado)"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-muted">
              {missing.length === 0
                ? published
                  ? "Publicado. Al guardar cambios, el sitio se actualiza en unos 2 minutos."
                  : "Listo para publicar."
                : `Falta${missing.length === 1 ? "" : "n"} ${missing.length} dato${missing.length === 1 ? "" : "s"} obligatorio${missing.length === 1 ? "" : "s"} para publicar.`}
            </p>
          </Card>
        </aside>
      </div>

      {picker && (
        <MediaPicker
          title={
            picker === "cover"
              ? "Foto de portada"
              : picker === "gallery"
                ? "Agregar fotos a la galería"
                : "Imagen al compartir"
          }
          purpose={picker}
          multiple={picker === "gallery"}
          selected={
            picker === "gallery"
              ? []
              : [
                  (picker === "cover"
                    ? values.coverMediaId
                    : values.ogImageMediaId) ?? "",
                ].filter(Boolean)
          }
          onClose={() => setPicker(null)}
          onConfirm={(ids) => {
            if (picker === "gallery") {
              const merged = [
                ...values.gallery,
                ...ids.filter((x) => !values.gallery.includes(x)),
              ];
              setValue("gallery", merged, { shouldDirty: true });
            } else {
              setValue(
                picker === "cover" ? "coverMediaId" : "ogImageMediaId",
                ids[0] ?? null,
                { shouldDirty: true },
              );
            }
            setPicker(null);
          }}
        />
      )}

      {confirm === "delete" && project && (
        <Dialog
          title="¿Eliminar este proyecto?"
          description={
            <>
              «{project.title}» se borrará definitivamente
              {published ? " y dejará de verse en el sitio" : ""}. Esta acción
              no se puede deshacer.
            </>
          }
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => void onDelete()}>
                Eliminar
              </Button>
            </>
          }
        />
      )}

      {confirm === "unpublish" && (
        <Dialog
          title="¿Despublicar este proyecto?"
          description="Dejará de verse en el sitio en unos 2 minutos. Queda guardado como borrador y puedes volver a publicarlo cuando quieras."
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Cancelar
              </Button>
              <Button onClick={() => void onUnpublish()}>Despublicar</Button>
            </>
          }
        />
      )}

      {confirm !== null && typeof confirm === "object" && (
        <Dialog
          title="Tienes cambios sin guardar"
          description="Si sales ahora, se perderán."
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button
                variant="danger"
                onClick={() => {
                  const leave = confirm.leave;
                  setConfirm(null);
                  reset(getValues());
                  leave();
                }}
              >
                Salir sin guardar
              </Button>
              <Button onClick={() => setConfirm(null)}>Seguir editando</Button>
            </>
          }
        />
      )}
    </form>
  );
}

function SectionTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-lg leading-6 font-semibold text-ink">{title}</h3>
      <p className="max-w-[65ch] text-sm leading-5 text-ink-muted">{text}</p>
    </div>
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

function EmptyImage({
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

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

function RegionSelect({
  value,
  error,
  registration,
}: {
  value: string;
  error: string | undefined;
  registration: ReturnType<
    ReturnType<typeof useForm<ProjectFormValues>>["register"]
  >;
}) {
  const id = useId();
  const known = (CHILE_REGIONS as readonly string[]).includes(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm leading-5 font-semibold text-ink">
        Región <span className="font-medium text-ink-muted">(opcional)</span>
      </label>
      <select
        id={id}
        {...registration}
        aria-invalid={error ? true : undefined}
        className={cx(
          "min-h-11 rounded-md border bg-surface-raised px-3 py-2.5 text-base text-ink",
          error ? "border-brand" : "border-border-strong",
        )}
      >
        <option value="">Sin región</option>
        {!known && value && <option value={value}>{value}</option>}
        {CHILE_REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {error && <p className="text-sm font-semibold text-brand">{error}</p>}
    </div>
  );
}

function ServicesField({
  control,
  serviceTitles,
  error,
}: {
  control: ReturnType<typeof useForm<ProjectFormValues>>["control"];
  serviceTitles: Record<string, string>;
  error: string | undefined;
}) {
  const errorId = useId();
  return (
    <Controller
      control={control}
      name="services"
      render={({ field }) => (
        <fieldset
          aria-describedby={error ? errorId : undefined}
          className="flex flex-col gap-2"
        >
          <legend className="mb-1 text-sm leading-5 font-semibold text-ink">
            Servicios
          </legend>
          <p className="text-sm text-ink-muted">
            Elige los servicios que se prestaron. Sirven para filtrar los
            proyectos en el sitio.
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {SERVICE_SLUGS.map((slug, i) => {
              const checked = field.value.includes(slug);
              return (
                <label key={slug} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    ref={i === 0 ? field.ref : undefined}
                    checked={checked}
                    onBlur={field.onBlur}
                    onChange={() =>
                      field.onChange(
                        checked
                          ? field.value.filter((s) => s !== slug)
                          : SERVICE_SLUGS.filter(
                              (s) => s === slug || field.value.includes(s),
                            ),
                      )
                    }
                    className="size-5 accent-brand"
                  />
                  <span className="text-ink">
                    {serviceTitles[slug] ?? slug}
                  </span>
                </label>
              );
            })}
          </div>
          {error && (
            <p id={errorId} className="text-sm font-semibold text-brand">
              {error}
            </p>
          )}
        </fieldset>
      )}
    />
  );
}
