import { describe, expect, it } from "vitest";
import {
  ALT_MAX,
  altError,
  formatBytes,
  orderedIds,
  smallForCover,
  mediaUsage,
  withAddedIds,
  uploadError,
} from "../src/lib/admin/media";

function file(type: string, size: number) {
  return { type, size, name: "x" };
}

describe("uploadError", () => {
  it("accepts JPEG, PNG, WebP and AVIF up to 15 MB", () => {
    expect(uploadError(file("image/jpeg", 1000))).toBeNull();
    expect(uploadError(file("image/avif", 15 * 1024 * 1024))).toBeNull();
  });

  it("explains other formats and files that are too big", () => {
    expect(uploadError(file("image/svg+xml", 10))).toMatch(/JPG, PNG, WebP/);
    expect(uploadError(file("application/pdf", 10))).toMatch(/JPG, PNG, WebP/);
    expect(uploadError(file("image/png", 15 * 1024 * 1024 + 1))).toMatch(
      /15 MB/,
    );
  });
});

describe("altError", () => {
  it("requires a description of at most 250 characters", () => {
    expect(altError("  ")).toMatch(/Describe/);
    expect(altError("Planta elevadora de aguas servidas")).toBeNull();
    expect(altError("x".repeat(ALT_MAX + 1))).toMatch(/250/);
  });
});

describe("smallForCover", () => {
  it("flags images narrower than 1600 px", () => {
    expect(smallForCover({ width: 1200, height: 800 })).toBe(true);
    expect(smallForCover({ width: 2048, height: 1365 })).toBe(false);
    expect(smallForCover({ width: 0, height: 0 })).toBe(false);
  });
});

describe("formatBytes", () => {
  it("uses KB and MB with a Chilean decimal comma", () => {
    expect(formatBytes(900)).toBe("1 KB");
    expect(formatBytes(250_000)).toBe("244 KB");
    expect(formatBytes(3_400_000)).toBe("3,2 MB");
  });
});

describe("orderedIds", () => {
  it("moves an item up or down and removes it", () => {
    expect(orderedIds(["a", "b", "c"], "c", "up")).toEqual(["a", "c", "b"]);
    expect(orderedIds(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(orderedIds(["a", "b", "c"], "a", "down")).toEqual(["b", "a", "c"]);
    expect(orderedIds(["a", "b", "c"], "b", "remove")).toEqual(["a", "c"]);
  });
});

describe("withAddedIds", () => {
  it("appends the picked photos in order and skips the ones already there", () => {
    expect(withAddedIds(["a", "b"], ["c", "a", "d"])).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(withAddedIds([], [])).toEqual([]);
  });
});

describe("mediaUsage", () => {
  const project = {
    id: "p1",
    title: "Canal La Petaca",
    coverMediaId: "m1",
    gallery: ["m2", "m1"],
    seo: { ogImageMediaId: "m3" },
  };
  const news = {
    id: "n1",
    title: "",
    coverMediaId: null,
    gallery: ["m2"],
    seo: {},
  };
  const hero = { photos: [{ mediaId: "m2" }] };

  it("lists every place an image appears, with its role and editor", () => {
    const usage = mediaUsage({ projects: [project], news: [news], hero });
    expect(usage.get("m1")).toEqual([
      {
        label: "Canal La Petaca",
        kind: "Proyecto",
        roles: ["portada", "galería"],
        href: "/admin/proyectos/editar?id=p1",
      },
    ]);
    expect(usage.get("m2")).toEqual([
      {
        label: "Canal La Petaca",
        kind: "Proyecto",
        roles: ["galería"],
        href: "/admin/proyectos/editar?id=p1",
      },
      {
        label: "Sin título",
        kind: "Noticia",
        roles: ["galería"],
        href: "/admin/noticias/editar?id=n1",
      },
      {
        label: "Portada del sitio",
        kind: "Inicio",
        roles: ["foto"],
        href: "/admin/portada",
      },
    ]);
    expect(usage.get("m3")?.[0]?.roles).toEqual(["imagen para compartir"]);
  });

  it("leaves unused images out", () => {
    const usage = mediaUsage({ projects: [project], news: [], hero: null });
    expect(usage.has("m9")).toBe(false);
    expect(usage.get("m2")).toHaveLength(1);
  });
});
