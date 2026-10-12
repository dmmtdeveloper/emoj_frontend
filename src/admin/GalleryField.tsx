/**
 * An ordered photo gallery for the project and news editors: the count, an
 * "Agregar fotos" button, and each photo with buttons to move it earlier or
 * later and to take it out. Adding photos opens the media library
 * (the editor owns the picker and calls `onAdd`).
 */
import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import type { AdminMedia } from "../lib/admin/api";
import { orderedIds } from "../lib/admin/media";
import { EmptyImage, IconButton } from "./editor-kit";
import { MediaThumb } from "./MediaPicker";
import { Button } from "./ui";

interface GalleryFieldProps {
  ids: readonly string[];
  media: ReadonlyMap<string, AdminMedia>;
  error?: string | undefined;
  onAdd: () => void;
  onChange: (ids: string[]) => void;
}

export function GalleryField({
  ids,
  media,
  error,
  onAdd,
  onChange,
}: GalleryFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">
          Galería{" "}
          <span className="font-medium text-ink-muted">
            ({ids.length} {ids.length === 1 ? "foto" : "fotos"})
          </span>
        </h4>
        {ids.length > 0 && (
          <Button variant="secondary" onClick={onAdd}>
            <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />
            Agregar fotos
          </Button>
        )}
      </div>
      {error && <p className="text-sm font-semibold text-brand">{error}</p>}
      {ids.length === 0 ? (
        <EmptyImage label="Agregar fotos a la galería" onClick={onAdd} />
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ids.map((mediaId, index) => {
            const move = (action: "up" | "down" | "remove") =>
              onChange(orderedIds(ids, mediaId, action));
            const name = `foto ${index + 1}`;
            return (
              <li
                key={mediaId}
                className="flex flex-col overflow-hidden rounded-md border border-border"
              >
                <MediaThumb
                  media={media.get(mediaId)}
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
                      disabled={index === ids.length - 1}
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
  );
}
