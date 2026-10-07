/**
 * After a change in the panel, the pages that show the item are rendered
 * again (POST /admin/revalidar, see src/lib/content/revalidation.ts) and the
 * editor confirms it in a dialog: "live" when the site already shows it,
 * "later" when the refresh could not run and the change arrives with the
 * next rebuild, in a few minutes.
 */
export type SiteState = "live" | "later";

export interface ContentChange {
  kind: "news" | "project";
  slug: string;
  previousSlug: string | null;
}

export async function refreshSite(
  change: ContentChange,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteState> {
  try {
    const res = await fetchImpl("/admin/revalidar", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    });
    if (!res.ok) return "later";
    const body: unknown = await res.json();
    const failed = (body as { failed?: unknown } | null)?.failed;
    return Array.isArray(failed) && failed.length === 0 ? "live" : "later";
  } catch {
    return "later";
  }
}

export interface ContentNoun {
  /** "noticia" / "proyecto". */
  singular: string;
  feminine: boolean;
}

export type EditorAction =
  "created" | "saved" | "published" | "unpublished" | "deleted";

export interface SuccessNotice {
  title: string;
  text: string;
  /** Offer "Ver en el sitio" (the item is public). */
  showLink: boolean;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The dialog shown after a change. `state` is null for drafts (nothing
 * public changed), "pending" while the site is being refreshed.
 */
export function successNotice(
  action: EditorAction,
  noun: ContentNoun,
  title: string,
  state: SiteState | "pending" | null,
): SuccessNotice {
  const a = noun.feminine ? "a" : "o";
  const name = capitalize(noun.singular);
  const pending = "Actualizando el sitio…";
  const draft = `Guardamos «${title}» como borrador. Todavía no se ve en el sitio: publícalo cuando esté listo.`;

  switch (action) {
    case "created":
      return { title: "Borrador creado", text: draft, showLink: false };
    case "saved":
      if (state === null) {
        return { title: "Borrador guardado", text: draft, showLink: false };
      }
      return {
        title: "Cambios guardados",
        text:
          state === "pending"
            ? pending
            : state === "live"
              ? "Los cambios ya se ven en el sitio."
              : "Los cambios se verán en el sitio en unos minutos.",
        showLink: state !== "pending",
      };
    case "published":
      return {
        title: `${name} publicad${a}`,
        text:
          state === "pending"
            ? pending
            : state === "live"
              ? `«${title}» ya está en el sitio.`
              : `«${title}» aparecerá en el sitio en unos minutos.`,
        showLink: state !== "pending",
      };
    case "unpublished": {
      const kept = `Sigue guardad${a} como borrador.`;
      return {
        title: `${name} despublicad${a}`,
        text:
          state === "pending"
            ? pending
            : state === "live"
              ? `Ya no se ve en el sitio. ${kept}`
              : `Dejará de verse en el sitio en unos minutos. ${kept}`,
        showLink: false,
      };
    }
    case "deleted":
      return {
        title: `${name} eliminad${a}`,
        text:
          state === null
            ? `Se eliminó «${title}».`
            : state === "pending"
              ? `Se eliminó «${title}». ${pending}`
              : state === "live"
                ? `Se eliminó «${title}» y ya no está en el sitio.`
                : `Se eliminó «${title}»; dejará de verse en el sitio en unos minutos.`,
        showLink: false,
      };
  }
}
