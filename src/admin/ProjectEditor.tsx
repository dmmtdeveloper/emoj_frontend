/**
 * Project editor (new and existing). The form follows the API rules
 * (src/lib/admin/project-form.ts) and keeps a checklist of what publishing
 * needs. Saving, publishing, the leave guard and the shared page pieces come
 * from editor-kit.tsx (the news editor uses the same ones).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { type AdminProject, type ProjectInput } from "../lib/admin/api";
import type { EditorTab } from "../lib/admin/editor-tabs";
import { withAddedIds } from "../lib/admin/media";
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
  type ProjectFormValues,
} from "../lib/admin/project-form";
import { projectMagnitude } from "../lib/content/magnitude";
import { SERVICE_SLUGS } from "../lib/services";
import { adminApi } from "./api";
import { EditorSkeleton } from "./skeletons";
import { GalleryField } from "./GalleryField";
import { ErrorNotice, unwrap } from "./common";
import {
  BannerSlot,
  ChecklistCard,
  CoverChooser,
  DeleteAction,
  EditorDialogs,
  EditorHeader,
  EditorTabs,
  SectionTitle,
  SeoCard,
  StepPanel,
  useContentEditor,
  type EditorAdapter,
} from "./editor-kit";
import { mediaById, MediaPicker, useMediaLibrary } from "./MediaPicker";
import { editProjectHref } from "./projects";
import { Card, Counter, cx, Field, Notice, SelectField, TextArea } from "./ui";

const LIST_PATH = "/admin/proyectos";

const TABS: readonly EditorTab[] = [
  {
    id: "datos",
    label: "Datos",
    fields: [
      "title",
      "client",
      "year",
      "location",
      "region",
      "services",
      "magnitudeLabel",
      "magnitudeValue",
      "magnitudeUnit",
      "featured",
    ],
  },
  { id: "fotos", label: "Fotos", fields: ["coverMediaId", "gallery"] },
  {
    id: "contenido",
    label: "Contenido",
    fields: ["summary", "challenge", "solution", "result"],
  },
  {
    id: "google",
    label: "Google",
    fields: ["seoTitle", "seoDescription", "slug", "ogImageMediaId"],
  },
];

type Picker = null | "cover" | "gallery" | "og";

const ADAPTER: EditorAdapter<AdminProject, ProjectFormValues, ProjectInput> = {
  itemKey: "project",
  listKey: "projects",
  listPath: LIST_PATH,
  editPath: "/admin/proyectos/editar",
  editHref: editProjectHref,
  kind: "project",
  noun: { singular: "proyecto", feminine: false },
  sitePath: (slug) => `/proyectos/${slug}`,
  toForm: projectToForm,
  toInput: formToProjectInput,
  create: (input) => adminApi.createProject(input),
  update: (id, input) => adminApi.updateProject(id, input),
  publish: (id) => adminApi.publishProject(id),
  unpublish: (id) => adminApi.unpublishProject(id),
  remove: (id) => adminApi.deleteProject(id),
  previewToken: (id) => adminApi.createPreviewToken("project", id),
  fieldErrors: formErrorsFromProblem,
  checklist: publishChecklist,
};

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
    return <EditorSkeleton label="Cargando el proyecto…" />;
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
  const library = useMediaLibrary();
  const media = useMemo(() => mediaById(library.data), [library.data]);
  const [picker, setPicker] = useState<Picker>(null);
  const schema = useMemo(() => projectFormSchema(new Date()), []);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ? projectToForm(initial) : emptyProjectForm(),
    mode: "onTouched",
  });
  const {
    register,
    control,
    setValue,
    formState: { errors, isDirty },
  } = form;
  const values = useWatch({ control }) as ProjectFormValues;
  const editor = useContentEditor(ADAPTER, initial, form, TABS);
  const checklist = publishChecklist(values);
  const step = { tabs: TABS, current: editor.tab, onChange: editor.setTab };
  const { item: project, isNew, status } = editor;
  const published = status === "published";
  const title =
    values.title.trim() || (isNew ? "Nuevo proyecto" : "Sin nombre");

  return (
    <form
      noValidate
      onSubmit={editor.onSave}
      className="mx-auto flex max-w-6xl flex-col gap-6 pb-24 lg:pb-0"
      aria-labelledby="editor-title"
    >
      <EditorHeader
        backLabel="Proyectos"
        listPath={LIST_PATH}
        title={title}
        status={status}
        isDirty={isDirty}
        item={project}
        siteHref={project ? `/proyectos/${project.slug}` : null}
        busy={editor.busy}
        publishedLabel="Publicado"
        onPreview={editor.onPreview}
        onPublish={editor.onPublish}
        onAskUnpublish={() => editor.setConfirm("unpublish")}
      />

      <BannerSlot banner={editor.banner} bannerRef={editor.bannerRef} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          id="editor-steps"
          className="flex min-w-0 scroll-mt-24 flex-col gap-6"
        >
          <EditorTabs
            tabs={TABS}
            current={editor.tab}
            onChange={editor.setTab}
            checklist={checklist}
            errorFields={Object.keys(errors)}
          />

          <StepPanel id="datos" {...step}>
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
              <MagnitudeField
                control={control}
                register={register}
                errors={errors}
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
          </StepPanel>

          <StepPanel id="fotos" {...step}>
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
                <CoverChooser
                  mediaId={values.coverMediaId}
                  media={
                    values.coverMediaId
                      ? media.get(values.coverMediaId)
                      : undefined
                  }
                  emptyLabel="Elegir foto de portada"
                  onPick={() => setPicker("cover")}
                  onClear={() =>
                    setValue("coverMediaId", null, { shouldDirty: true })
                  }
                />
              </div>

              <GalleryField
                ids={values.gallery}
                media={media}
                error={errors.gallery?.message}
                onAdd={() => setPicker("gallery")}
                onChange={(ids) =>
                  setValue("gallery", ids, { shouldDirty: true })
                }
              />
            </Card>
          </StepPanel>

          <StepPanel id="contenido" {...step}>
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
          </StepPanel>

          <StepPanel id="google" {...step}>
            <SeoCard
              noun="el proyecto"
              preview={{
                section: "proyectos",
                slug: values.slug,
                title: values.title,
                seoTitle: values.seoTitle,
                seoDescription: values.seoDescription,
                fallbackDescription: values.summary,
              }}
              limits={PROJECT_LIMITS}
              fields={{
                seoTitle: register("seoTitle"),
                seoDescription: register("seoDescription"),
                slug: register("slug"),
              }}
              errors={{
                seoTitle: errors.seoTitle?.message,
                seoDescription: errors.seoDescription?.message,
                slug: errors.slug?.message,
              }}
              isNew={isNew}
              published={published}
              emptyTitleHint="Si lo dejas vacío se usa el nombre del proyecto."
              emptyDescriptionHint="Obligatoria para publicar. Resume el proyecto e incluye el servicio y el lugar."
              ogImage={{
                id: values.ogImageMediaId,
                media: values.ogImageMediaId
                  ? media.get(values.ogImageMediaId)
                  : undefined,
              }}
              onPickOg={() => setPicker("og")}
              onClearOg={() =>
                setValue("ogImageMediaId", null, { shouldDirty: true })
              }
            />
          </StepPanel>
        </div>

        <ChecklistCard
          checklist={checklist}
          published={published}
          onGoTo={editor.reveal}
        >
          {!isNew && (
            <DeleteAction
              label="Eliminar proyecto"
              text="Se borra del panel y, si está publicado, del sitio. Las fotos siguen en la biblioteca."
              busy={editor.busy}
              onAsk={() => editor.setConfirm("delete")}
            />
          )}
        </ChecklistCard>
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
              setValue("gallery", withAddedIds(values.gallery, ids), {
                shouldDirty: true,
              });
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

      <EditorDialogs
        confirm={editor.confirm}
        onCancel={() => editor.setConfirm(null)}
        itemTitle={project?.title ?? ""}
        published={published}
        noun="este proyecto"
        onDelete={() => void editor.remove()}
        onUnpublish={() => void editor.unpublish()}
        onLeave={editor.leave}
      />
    </form>
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
  const known = (CHILE_REGIONS as readonly string[]).includes(value);
  return (
    <SelectField label="Región" optional error={error} {...registration}>
      <option value="">Sin región</option>
      {!known && value && <option value={value}>{value}</option>}
      {CHILE_REGIONS.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </SelectField>
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
          <div className="flex flex-wrap gap-2 pt-1">
            {SERVICE_SLUGS.map((slug, i) => {
              const checked = field.value.includes(slug);
              return (
                <label
                  key={slug}
                  className={cx(
                    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-base transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring",
                    checked
                      ? "border-surface-inverse bg-surface-inverse text-ink-inverse"
                      : "border-border-strong bg-surface-raised text-ink hover:bg-surface-sunken",
                  )}
                >
                  {checked ? (
                    <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                  ) : (
                    <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                  )}
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
                    className="sr-only"
                  />
                  <span>{serviceTitles[slug] ?? slug}</span>
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

/** Common units in EMOJ projects, offered as suggestions (any text works). */
const UNIT_SUGGESTIONS = [
  "l/s",
  "m³/s",
  "m³",
  "m²",
  "ha",
  "km",
  "m",
  "kW",
  "viviendas",
  "habitantes",
] as const;

/**
 * Headline figure ("Caudal 1.200 l/s"), in the order it reads on the site:
 * the figure with its unit, then what it measures, which the page shows
 * small above the number. A preview mirrors the project page as you type.
 */
function MagnitudeField({
  control,
  register,
  errors,
}: {
  control: ReturnType<typeof useForm<ProjectFormValues>>["control"];
  register: ReturnType<typeof useForm<ProjectFormValues>>["register"];
  errors: ReturnType<typeof useForm<ProjectFormValues>>["formState"]["errors"];
}) {
  const unitsId = useId();
  const [label, value, unit] = useWatch({
    control,
    name: ["magnitudeLabel", "magnitudeValue", "magnitudeUnit"],
  });
  const preview = projectMagnitude({ label, value, unit });
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-ink">
        Cifra destacada{" "}
        <span className="font-medium text-ink-muted">(opcional)</span>
      </legend>
      <p className="max-w-[65ch] text-sm text-ink-muted">
        Un número que resume el tamaño del proyecto. La ficha lo muestra en
        grande junto a la foto, y la tarjeta del proyecto, abajo. Déjalo vacío
        si no aplica.
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-[minmax(0,1fr)_9rem] items-start gap-3">
            <Field
              label="Cifra"
              hint="Como quieres que se lea: 1.200 o 2,4."
              inputMode="decimal"
              autoComplete="off"
              {...register("magnitudeValue")}
              error={errors.magnitudeValue?.message}
            />
            <Field
              label="Unidad"
              optional
              hint="Ej.: km, l/s."
              autoComplete="off"
              list={unitsId}
              {...register("magnitudeUnit")}
              error={errors.magnitudeUnit?.message}
            />
            <datalist id={unitsId}>
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
          <Field
            label="Qué mide"
            optional
            hint="Va en letra pequeña sobre la cifra. Ej.: Caudal tratado, Canal revestido."
            autoComplete="off"
            {...register("magnitudeLabel")}
            error={errors.magnitudeLabel?.message}
          />
        </div>
        <figure className="flex flex-col gap-2">
          <figcaption className="text-sm font-semibold text-ink">
            Así se verá en la ficha
          </figcaption>
          {preview ? (
            <div
              aria-hidden="true"
              className="flex min-h-36 flex-col justify-end gap-2 rounded-l-signature rounded-r-lg bg-surface-inverse px-6 py-5 font-data text-ink-inverse"
            >
              {preview.label && (
                <span className="text-xs leading-4 font-medium tracking-[0.1em] text-ink-inverse/70 uppercase">
                  {preview.label}
                </span>
              )}
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-5xl leading-none font-semibold tracking-[-0.05em] tabular-nums">
                  {preview.value}
                </span>
                {preview.unit && (
                  <span className="shrink-0 text-xl leading-none font-medium text-ink-inverse/80">
                    {preview.unit}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="grid min-h-36 place-items-center rounded-lg border-2 border-dashed border-border-strong px-6 text-center text-sm text-ink-muted">
              Escribe una cifra para ver cómo queda.
            </div>
          )}
          {preview && (
            <p className="sr-only">
              Vista previa:{" "}
              {[preview.label, preview.value, preview.unit]
                .filter(Boolean)
                .join(" ")}
            </p>
          )}
        </figure>
      </div>
    </fieldset>
  );
}
