/**
 * News editor (new and existing): title, excerpt, category, cover, the
 * article text (TipTap) and the Google fields. Saving, publishing and the
 * shared page pieces come from editor-kit.tsx, like the project editor.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { AdminNews, NewsInput } from "../lib/admin/api";
import type { EditorTab } from "../lib/admin/editor-tabs";
import {
  emptyNewsForm,
  formToNewsInput,
  NEWS_LIMITS,
  newsFormErrorsFromProblem,
  newsFormSchema,
  newsPublishChecklist,
  newsToForm,
  type NewsFormValues,
} from "../lib/admin/news-form";
import { charCount } from "../lib/admin/project-form";
import { adminApi } from "./api";
import { EditorSkeleton } from "./skeletons";
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
import { editNewsHref } from "./news";
import { RichTextEditor } from "./RichTextEditor";
import { Card, Counter, Field, Notice, TextArea } from "./ui";

const LIST_PATH = "/admin/noticias";

const TABS: readonly EditorTab[] = [
  {
    id: "noticia",
    label: "Noticia",
    fields: ["title", "excerpt", "category", "coverMediaId"],
  },
  { id: "texto", label: "Texto", fields: ["body"] },
  {
    id: "google",
    label: "Google",
    fields: ["seoTitle", "seoDescription", "slug", "ogImageMediaId"],
  },
];

type Picker = null | "cover" | "og";

const ADAPTER: EditorAdapter<AdminNews, NewsFormValues, NewsInput> = {
  itemKey: "news-item",
  listKey: "news",
  listPath: LIST_PATH,
  editPath: "/admin/noticias/editar",
  editHref: editNewsHref,
  kind: "news",
  noun: { singular: "noticia", feminine: true },
  sitePath: (slug) => `/noticias/${slug}`,
  toForm: newsToForm,
  toInput: formToNewsInput,
  create: (input) => adminApi.createNews(input),
  update: (id, input) => adminApi.updateNews(id, input),
  publish: (id) => adminApi.publishNews(id),
  unpublish: (id) => adminApi.unpublishNews(id),
  remove: (id) => adminApi.deleteNews(id),
  previewToken: (id) => adminApi.createPreviewToken("news", id),
  fieldErrors: newsFormErrorsFromProblem,
  checklist: newsPublishChecklist,
};

/** Categories already in use, to suggest them (the field stays free). */
function useCategories() {
  return useQuery({
    queryKey: ["news-categories"],
    queryFn: async () => {
      const page = unwrap(await adminApi.listNews({ pageSize: 50 }));
      return [
        ...new Set(page.items.map((n) => n.category).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, "es"));
    },
    staleTime: 5 * 60_000,
  });
}

export function NewsEditor({ id }: { id: string | null }) {
  const query = useQuery({
    queryKey: ["news-item", id],
    queryFn: async () => unwrap(await adminApi.getNews(id ?? "")),
    enabled: id !== null && id !== "",
  });

  if (id === "") {
    return (
      <Notice tone="error">
        Falta la noticia a editar. <a href={LIST_PATH}>Vuelve a la lista</a>.
      </Notice>
    );
  }
  if (id !== null && query.error) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
        <a href={LIST_PATH}>Volver a las noticias</a>
      </div>
    );
  }
  if (id !== null && !query.data) {
    return <EditorSkeleton label="Cargando la noticia…" />;
  }
  return <EditorForm news={query.data ?? null} />;
}

function EditorForm({ news: initial }: { news: AdminNews | null }) {
  const library = useMediaLibrary();
  const media = useMemo(() => mediaById(library.data), [library.data]);
  const categories = useCategories();
  const categoriesId = useId();
  const [picker, setPicker] = useState<Picker>(null);
  const schema = useMemo(() => newsFormSchema(), []);

  const form = useForm<NewsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ? newsToForm(initial) : emptyNewsForm(),
    mode: "onTouched",
  });
  const {
    register,
    control,
    setValue,
    formState: { errors, isDirty },
  } = form;
  const values = useWatch({ control }) as NewsFormValues;
  const editor = useContentEditor(ADAPTER, initial, form, TABS);
  const checklist = newsPublishChecklist(values);
  const step = { tabs: TABS, current: editor.tab, onChange: editor.setTab };
  const { item: news, isNew, status } = editor;
  const published = status === "published";
  const title = values.title.trim() || (isNew ? "Nueva noticia" : "Sin título");

  return (
    <form
      noValidate
      onSubmit={editor.onSave}
      className="mx-auto flex max-w-6xl flex-col gap-6 pb-24 lg:pb-0"
      aria-labelledby="editor-title"
    >
      <EditorHeader
        backLabel="Noticias"
        listPath={LIST_PATH}
        title={title}
        status={status}
        isDirty={isDirty}
        item={news}
        siteHref={news ? `/noticias/${news.slug}` : null}
        busy={editor.busy}
        publishedLabel="Publicada"
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

          <StepPanel id="noticia" {...step}>
            <Card className="flex flex-col gap-5">
              <SectionTitle
                title="Noticia"
                text="El título y la bajada aparecen en la lista de noticias y al inicio del artículo."
              />
              <Field
                label="Título"
                {...register("title")}
                error={errors.title?.message}
                aside={
                  <Counter
                    count={charCount(values.title)}
                    max={NEWS_LIMITS.title}
                  />
                }
              />
              <TextArea
                label="Bajada"
                hint="Una o dos frases que resumen la noticia. Obligatoria para publicar."
                rows={3}
                {...register("excerpt")}
                error={errors.excerpt?.message}
                aside={
                  <Counter
                    count={charCount(values.excerpt)}
                    max={NEWS_LIMITS.excerpt}
                  />
                }
              />
              <Field
                label="Categoría"
                optional
                hint="Una etiqueta corta, por ejemplo «Proyectos» o «Equipo». Usa las mismas para que las noticias se agrupen."
                list={categoriesId}
                autoComplete="off"
                {...register("category")}
                error={errors.category?.message}
                className="md:max-w-sm"
              />
              <datalist id={categoriesId}>
                {(categories.data ?? []).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
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
            </Card>
          </StepPanel>

          <StepPanel id="texto" {...step}>
            <Card className="flex flex-col gap-5">
              <SectionTitle
                title="Texto"
                text="Usa títulos de sección para ordenar el texto y párrafos cortos. Pegar desde Word o Google Docs conserva solo el formato que el sitio puede mostrar."
              />
              <Controller
                control={control}
                name="body"
                render={({ field }) => (
                  <RichTextEditor
                    label="Texto de la noticia"
                    hint="Obligatorio para publicar."
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    editorRef={field.ref}
                    error={errors.body?.message as string | undefined}
                  />
                )}
              />
            </Card>
          </StepPanel>

          <StepPanel id="google" {...step}>
            <SeoCard
              noun="la noticia"
              preview={{
                section: "noticias",
                slug: values.slug,
                title: values.title,
                seoTitle: values.seoTitle,
                seoDescription: values.seoDescription,
                fallbackDescription: values.excerpt,
              }}
              limits={NEWS_LIMITS}
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
              emptyTitleHint="Si lo dejas vacío se usa el título de la noticia."
              emptyDescriptionHint="Obligatoria para publicar. Cuenta en una frase de qué trata la noticia."
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
              label="Eliminar noticia"
              text="Se borra del panel y, si está publicada, del sitio. Las fotos siguen en la biblioteca."
              busy={editor.busy}
              onAsk={() => editor.setConfirm("delete")}
            />
          )}
        </ChecklistCard>
      </div>

      {picker && (
        <MediaPicker
          title={picker === "cover" ? "Foto de portada" : "Imagen al compartir"}
          purpose={picker}
          multiple={false}
          selected={[
            (picker === "cover"
              ? values.coverMediaId
              : values.ogImageMediaId) ?? "",
          ].filter(Boolean)}
          onClose={() => setPicker(null)}
          onConfirm={(ids) => {
            setValue(
              picker === "cover" ? "coverMediaId" : "ogImageMediaId",
              ids[0] ?? null,
              { shouldDirty: true },
            );
            setPicker(null);
          }}
        />
      )}

      <EditorDialogs
        confirm={editor.confirm}
        onCancel={() => editor.setConfirm(null)}
        itemTitle={news?.title ?? ""}
        published={published}
        noun="esta noticia"
        onDelete={() => void editor.remove()}
        onUnpublish={() => void editor.unpublish()}
        onLeave={editor.leave}
      />
    </form>
  );
}
