/**
 * Image picker for covers and galleries: the media library as a grid, plus
 * an upload area (drag and drop or file chooser). Every upload needs an
 * alternative text, explained in one line, and shows its progress.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ImageOff,
  ImagePlus,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { AdminMedia, AdminMediaPage } from "../lib/admin/api";
import { problemMessage } from "../lib/admin/errors";
import {
  ACCEPT_ATTR,
  ALT_MAX,
  altError,
  formatBytes,
  smallForCover,
  uploadError,
} from "../lib/admin/media";
import { charCount } from "../lib/admin/project-form";
import { adminApi } from "./api";
import { ErrorNotice, unwrap } from "./common";
import { Button, Counter, cx, Dialog, Field, Notice, ProgressBar } from "./ui";

const MEDIA_KEY = ["media-all"] as const;
const LIBRARY_PAGE_SIZE = 50;
const LIBRARY_MAX_PAGES = 20;

/** The whole media library (it is small), newest first. */
export function useMediaLibrary() {
  return useQuery({
    queryKey: MEDIA_KEY,
    queryFn: async () => {
      const items: AdminMedia[] = [];
      for (let page = 1; page <= LIBRARY_MAX_PAGES; page++) {
        const data: AdminMediaPage = unwrap(
          await adminApi.listMedia({ page, pageSize: LIBRARY_PAGE_SIZE }),
        );
        items.push(...data.items);
        if (items.length >= data.total || data.items.length === 0) break;
      }
      return items;
    },
    // Presigned URLs expire after hours; a few minutes of cache is safe.
    staleTime: 5 * 60_000,
  });
}

export function mediaById(items: readonly AdminMedia[] | undefined) {
  return new Map((items ?? []).map((m) => [m.id, m]));
}

export function MediaThumb({
  media,
  className,
  sizes = "160px",
}: {
  media: AdminMedia | undefined;
  className?: string;
  sizes?: string;
}) {
  if (!media?.url) {
    return (
      <span
        className={cx(
          "grid place-items-center bg-surface-sunken text-ink-muted",
          className,
        )}
      >
        <ImageOff size={22} strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only">
          {media ? media.alt : "Imagen no disponible"}
        </span>
      </span>
    );
  }
  return (
    <img
      src={media.url}
      alt={media.alt}
      width={media.width || undefined}
      height={media.height || undefined}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      className={cx("bg-surface-sunken object-cover", className)}
    />
  );
}

interface Pending {
  key: string;
  file: File;
  preview: string;
  alt: string;
  error: string | null;
  progress: number | null;
}

function UploadItem({
  item,
  onChange,
  onUpload,
  onRemove,
}: {
  item: Pending;
  onChange: (alt: string) => void;
  onUpload: () => void;
  onRemove: () => void;
}) {
  const uploading = item.progress !== null;
  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row">
      <img
        src={item.preview}
        alt=""
        className="aspect-[4/3] w-full shrink-0 rounded-sm bg-surface-sunken object-cover sm:w-36"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="truncate text-sm text-ink-muted">
          {item.file.name} · {formatBytes(item.file.size)}
        </p>
        {uploading ? (
          <ProgressBar value={item.progress ?? 0} label="Subiendo" />
        ) : (
          <>
            <Field
              label="¿Qué muestra la imagen?"
              hint="Este texto lo leen las personas que usan lectores de pantalla y Google. Ej.: «Instalación de tuberías en la planta elevadora de Limache»."
              value={item.alt}
              maxLength={ALT_MAX + 20}
              onChange={(e) => onChange(e.target.value)}
              error={item.error ?? undefined}
              aside={<Counter count={charCount(item.alt)} max={ALT_MAX} />}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={onUpload}>
                <Upload size={18} strokeWidth={1.75} aria-hidden="true" />
                Subir imagen
              </Button>
              <Button variant="ghost" onClick={onRemove}>
                Quitar
              </Button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

let pendingSeq = 0;

export function MediaPicker({
  title,
  purpose,
  multiple,
  selected,
  onClose,
  onConfirm,
}: {
  title: string;
  purpose: "cover" | "gallery" | "og";
  multiple: boolean;
  /** Ids already chosen (kept selected in the grid). */
  selected: readonly string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const library = useMediaLibrary();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<string[]>(() => [...selected]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dropError, setDropError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputId = useId();

  // Free the object URLs of previews when they go away.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function toggle(id: string) {
    setChosen((current) => {
      if (!multiple) return current[0] === id ? [] : [id];
      return current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
    });
  }

  function addFiles(files: FileList | File[]) {
    const list = [...files];
    const rejected = list
      .map((file) => ({ file, error: uploadError(file) }))
      .filter((r) => r.error);
    setDropError(
      rejected.length
        ? `${rejected.map((r) => r.file.name).join(", ")}: ${rejected[0]?.error}`
        : null,
    );
    const accepted = list.filter((f) => !uploadError(f));
    const next = (multiple ? accepted : accepted.slice(0, 1)).map((file) => {
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      return {
        key: `p${++pendingSeq}`,
        file,
        preview,
        alt: "",
        error: null,
        progress: null,
      } satisfies Pending;
    });
    setPending((current) => (multiple ? [...current, ...next] : next));
  }

  function update(key: string, patch: Partial<Pending>) {
    setPending((current) =>
      current.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    );
  }

  function remove(key: string) {
    setPending((current) => {
      const item = current.find((p) => p.key === key);
      if (item) {
        URL.revokeObjectURL(item.preview);
        previews.current.delete(item.preview);
      }
      return current.filter((p) => p.key !== key);
    });
  }

  async function upload(item: Pending) {
    const error = altError(item.alt);
    if (error) {
      update(item.key, { error });
      return;
    }
    update(item.key, { error: null, progress: 0 });
    const result = await adminApi.uploadMedia(
      item.file,
      item.alt.trim(),
      (progress) => update(item.key, { progress }),
    );
    if (!result.ok) {
      const altProblem =
        result.kind === "problem" &&
        result.problem.errors?.some((e) => e.field === "alt");
      update(item.key, {
        progress: null,
        error: altProblem
          ? "Revisa la descripción de la imagen."
          : uploadProblem(result),
      });
      return;
    }
    queryClient.setQueryData<AdminMedia[]>(MEDIA_KEY, (items) => [
      result.data,
      ...(items ?? []),
    ]);
    remove(item.key);
    setChosen((current) =>
      multiple ? [...current, result.data.id] : [result.data.id],
    );
  }

  // Drag and drop on the upload area (the file chooser covers keyboards).
  const dropZone = useRef<HTMLDivElement>(null);
  const addFilesRef = useRef(addFiles);
  useEffect(() => {
    addFilesRef.current = addFiles;
  });
  useEffect(() => {
    const zone = dropZone.current;
    if (!zone) return;
    const over = (event: DragEvent) => {
      event.preventDefault();
      setDragging(true);
    };
    const leave = () => setDragging(false);
    const drop = (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const files = event.dataTransfer?.files;
      if (files?.length) addFilesRef.current(files);
    };
    zone.addEventListener("dragover", over);
    zone.addEventListener("dragleave", leave);
    zone.addEventListener("drop", drop);
    return () => {
      zone.removeEventListener("dragover", over);
      zone.removeEventListener("dragleave", leave);
      zone.removeEventListener("drop", drop);
    };
  }, []);

  const items = library.data ?? [];
  const uploading = pending.some((p) => p.progress !== null);
  const confirmLabel = multiple
    ? `Agregar ${chosen.length === 1 ? "1 imagen" : `${chosen.length} imágenes`}`
    : "Usar esta imagen";

  return (
    <Dialog
      title={title}
      size="lg"
      onClose={onClose}
      description={
        multiple
          ? "Elige una o varias imágenes de la biblioteca, o sube nuevas."
          : "Elige una imagen de la biblioteca o sube una nueva."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={uploading || (!multiple && chosen.length === 0)}
            onClick={() => onConfirm(chosen)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div
          ref={dropZone}
          className={cx(
            "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragging
              ? "border-brand bg-surface-sunken"
              : "border-border-strong",
          )}
        >
          <ImagePlus
            size={28}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-ink-muted"
          />
          <p className="text-ink">
            Arrastra {multiple ? "imágenes" : "una imagen"} aquí o{" "}
            <label
              htmlFor={inputId}
              className="cursor-pointer font-semibold text-brand underline underline-offset-4"
            >
              elígela{multiple ? "s" : ""} en tu equipo
            </label>
          </p>
          <p className="text-sm text-ink-muted">
            JPG, PNG, WebP o AVIF de hasta 15 MB.
            {purpose === "cover" &&
              " Para la portada, idealmente de 1.600 px de ancho o más."}
          </p>
          <input
            id={inputId}
            type="file"
            accept={ACCEPT_ATTR}
            multiple={multiple}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {dropError && <Notice tone="error">{dropError}</Notice>}

        {pending.length > 0 && (
          <ul className="flex flex-col gap-3">
            {pending.map((item) => (
              <UploadItem
                key={item.key}
                item={item}
                onChange={(alt) => update(item.key, { alt, error: null })}
                onUpload={() => void upload(item)}
                onRemove={() => remove(item.key)}
              />
            ))}
          </ul>
        )}

        <section aria-labelledby={`${inputId}-library`}>
          <h3
            id={`${inputId}-library`}
            className="mb-3 text-base font-semibold text-ink"
          >
            Biblioteca
            {items.length > 0 && (
              <span className="font-medium text-ink-muted">
                {" "}
                ({items.length})
              </span>
            )}
          </h3>
          {library.error ? (
            <ErrorNotice
              error={library.error}
              retry={() => void library.refetch()}
            />
          ) : library.isPending ? (
            <p role="status" className="text-ink-muted">
              Cargando imágenes…
            </p>
          ) : items.length === 0 ? (
            <p className="text-ink-muted">
              Todavía no hay imágenes. Sube la primera.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {items.map((media) => {
                const isChosen = chosen.includes(media.id);
                const small = purpose === "cover" && smallForCover(media);
                return (
                  <li key={media.id}>
                    <button
                      type="button"
                      aria-pressed={isChosen}
                      onClick={() => toggle(media.id)}
                      className={cx(
                        "group relative block w-full overflow-hidden rounded-md text-left outline-offset-2",
                        isChosen
                          ? "ring-4 ring-brand"
                          : "ring-1 ring-border hover:ring-border-strong",
                      )}
                    >
                      <MediaThumb
                        media={media}
                        className="aspect-[4/3] w-full"
                      />
                      {isChosen && (
                        <span
                          aria-hidden="true"
                          className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-brand text-on-brand"
                        >
                          <Check size={16} strokeWidth={2.5} />
                        </span>
                      )}
                      {small && (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-sm bg-surface-raised px-1.5 py-0.5 text-xs font-semibold text-ink">
                          <TriangleAlert
                            size={12}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                          Pequeña para portada
                        </span>
                      )}
                      <span className="sr-only">
                        {media.alt}
                        {media.width
                          ? `, ${media.width} × ${media.height} px`
                          : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}

function uploadProblem(result: Parameters<typeof problemMessage>[0]): string {
  if (result.kind === "problem") {
    if (result.status === 413) {
      return "La imagen pesa más de 15 MB. Redúcela antes de subirla.";
    }
    if (result.status === 415 || result.status === 422) {
      return "El archivo no es una imagen JPG, PNG, WebP o AVIF válida.";
    }
    if (result.status === 503) {
      return "El almacenamiento de imágenes no está disponible ahora. Inténtalo en unos minutos.";
    }
  }
  return problemMessage(result);
}
