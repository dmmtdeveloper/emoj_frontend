import { describe, expect, it, vi } from "vitest";
import {
  refreshSite,
  successNotice,
  type ContentNoun,
} from "../src/lib/admin/site-refresh";

const news: ContentNoun = { singular: "noticia", feminine: true };
const project: ContentNoun = { singular: "proyecto", feminine: false };

describe("refreshSite", () => {
  it("posts the change to /admin/revalidar and reports it live when every page refreshed", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ refreshed: ["/"], failed: [] })),
    );
    const state = await refreshSite(
      { kind: "news", slug: "hito", previousSlug: null },
      fetchMock as unknown as typeof fetch,
    );
    expect(state).toBe("live");
    expect(fetchMock).toHaveBeenCalledWith("/admin/revalidar", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "news", slug: "hito", previousSlug: null }),
    });
  });

  it.each([
    [
      "a page failed",
      new Response(JSON.stringify({ refreshed: [], failed: ["/"] })),
    ],
    ["not configured", new Response("{}", { status: 503 })],
    ["unexpected body", new Response("nope")],
  ])("falls back to 'in a few minutes' when %s", async (_, response) => {
    const state = await refreshSite(
      { kind: "project", slug: "planta", previousSlug: null },
      (async () => response) as typeof fetch,
    );
    expect(state).toBe("later");
  });

  it("falls back when the network fails", async () => {
    const state = await refreshSite(
      { kind: "project", slug: "planta", previousSlug: null },
      (async () => {
        throw new TypeError("offline");
      }) as typeof fetch,
    );
    expect(state).toBe("later");
  });
});

describe("successNotice", () => {
  it("confirms a publication and says when it shows on the site", () => {
    expect(successNotice("published", news, "Hito", "pending")).toEqual({
      title: "Noticia publicada",
      text: "Actualizando el sitio…",
      showLink: false,
    });
    expect(successNotice("published", news, "Hito", "live")).toEqual({
      title: "Noticia publicada",
      text: "«Hito» ya está en el sitio.",
      showLink: true,
    });
    expect(successNotice("published", project, "Planta", "later").text).toBe(
      "«Planta» aparecerá en el sitio en unos minutos.",
    );
  });

  it("tells a draft apart from a public change", () => {
    expect(successNotice("created", project, "Planta", null)).toEqual({
      title: "Borrador creado",
      text: "Guardamos «Planta» como borrador. Todavía no se ve en el sitio: publícalo cuando esté listo.",
      showLink: false,
    });
    expect(successNotice("saved", news, "Hito", null).title).toBe(
      "Borrador guardado",
    );
    expect(successNotice("saved", news, "Hito", "live")).toEqual({
      title: "Cambios guardados",
      text: "Los cambios ya se ven en el sitio.",
      showLink: true,
    });
  });

  it("agrees in gender for unpublishing and deleting", () => {
    expect(successNotice("unpublished", news, "Hito", "live")).toEqual({
      title: "Noticia despublicada",
      text: "Ya no se ve en el sitio. Sigue guardada como borrador.",
      showLink: false,
    });
    expect(successNotice("unpublished", project, "Planta", "later").text).toBe(
      "Dejará de verse en el sitio en unos minutos. Sigue guardado como borrador.",
    );
    expect(successNotice("deleted", project, "Planta", "live")).toEqual({
      title: "Proyecto eliminado",
      text: "Se eliminó «Planta» y ya no está en el sitio.",
      showLink: false,
    });
    expect(successNotice("deleted", news, "Hito", null).text).toBe(
      "Se eliminó «Hito».",
    );
  });
});
