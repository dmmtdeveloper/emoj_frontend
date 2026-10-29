import { describe, expect, it } from "vitest";
import type { HomeHero } from "../src/lib/api/client";
import {
  BUILT_IN_PHOTOS,
  builtInInLibrary,
  DEFAULT_HERO_COPY,
  focusClasses,
  heroCopy,
  isExternalHref,
  keepNumbersTogether,
  titleParts,
} from "../src/lib/content/home-hero";

const NBSP = " ";

describe("titleParts", () => {
  it("splits the title around the first match of the highlight", () => {
    expect(
      titleParts("Más de 30 años innovando en consultoría", "innovando"),
    ).toEqual({
      before: "Más de 30 años ",
      highlight: "innovando",
      after: " en consultoría",
    });
  });

  it("keeps the whole title when the highlight is empty or missing", () => {
    const whole = { before: "Ingeniería", highlight: "", after: "" };
    expect(titleParts("Ingeniería", "")).toEqual(whole);
    expect(titleParts("Ingeniería", "agua")).toEqual(whole);
  });

  it("handles a highlight at either end", () => {
    expect(titleParts("Agua para Chile", "Agua")).toEqual({
      before: "",
      highlight: "Agua",
      after: " para Chile",
    });
    expect(titleParts("Cuidamos el agua", "agua")).toEqual({
      before: "Cuidamos el ",
      highlight: "agua",
      after: "",
    });
  });
});

describe("keepNumbersTogether", () => {
  it("glues a number to the next word so it never ends a line", () => {
    expect(keepNumbersTogether("Más de 30 años innovando")).toBe(
      `Más de 30${NBSP}años innovando`,
    );
    expect(keepNumbersTogether("1.200 km de redes y 15 proyectos")).toBe(
      `1.200${NBSP}km de redes y 15${NBSP}proyectos`,
    );
  });

  it("leaves other spaces alone", () => {
    expect(keepNumbersTogether("Ingeniería civil")).toBe("Ingeniería civil");
  });
});

describe("focusClasses", () => {
  it("rounds the focal point to 5% steps", () => {
    expect(focusClasses(30, 70)).toBe("focus-x-30 focus-y-70");
    expect(focusClasses(32, 68)).toBe("focus-x-30 focus-y-70");
    expect(focusClasses(33, 2)).toBe("focus-x-35 focus-y-0");
  });

  it("clamps out-of-range values", () => {
    expect(focusClasses(-10, 140)).toBe("focus-x-0 focus-y-100");
  });
});

describe("isExternalHref", () => {
  it("is true only for http and https links", () => {
    expect(isExternalHref("https://wa.me/56912345678")).toBe(true);
    expect(isExternalHref("http://example.cl/obra")).toBe(true);
    expect(isExternalHref("HTTP://EXAMPLE.CL")).toBe(true);
    expect(isExternalHref("//example.cl")).toBe(false);
    expect(isExternalHref("/contacto")).toBe(false);
    expect(isExternalHref("mailto:coordinacion@emoj.cl")).toBe(false);
    expect(isExternalHref("tel:+56322123456")).toBe(false);
  });
});

describe("heroCopy", () => {
  const hero: HomeHero = {
    title: "Ingeniería que cuida el agua",
    highlight: "agua",
    lead: "Proyectos sanitarios.",
    primaryCta: { label: "Escríbenos", href: "/contacto" },
    photos: [],
    updatedAt: "2026-10-12T18:00:00Z",
  };

  it("uses the panel's copy, without a hidden secondary button", () => {
    expect(heroCopy(hero)).toEqual({
      title: "Ingeniería que cuida el agua",
      highlight: "agua",
      lead: "Proyectos sanitarios.",
      primaryCta: { label: "Escríbenos", href: "/contacto" },
      secondaryCta: null,
    });
  });

  it("keeps the secondary button when set", () => {
    const secondaryCta = { label: "Ver proyectos", href: "/proyectos" };
    expect(heroCopy({ ...hero, secondaryCta }).secondaryCta).toEqual(
      secondaryCta,
    );
  });

  it("falls back to the built-in copy without a hero", () => {
    expect(heroCopy(null)).toEqual(DEFAULT_HERO_COPY);
    expect(DEFAULT_HERO_COPY.title).toBe(
      "Más de 30 años innovando en consultoría",
    );
    expect(DEFAULT_HERO_COPY.secondaryCta).toEqual({
      label: "Ver proyectos",
      href: "/proyectos",
    });
  });
});

describe("BUILT_IN_PHOTOS", () => {
  it("describes the three photos the site shipped with", () => {
    expect(BUILT_IN_PHOTOS.map((p) => p.file)).toEqual([
      "agua-manos.jpg",
      "estacion-bombeo-tuberias.jpg",
      "vista-aerea-industrial.jpg",
    ]);
    for (const p of BUILT_IN_PHOTOS) {
      expect(p.alt.length).toBeGreaterThan(10);
      expect(p.focusX % 5).toBe(0);
    }
  });

  it("finds the ones already in the media library by their alt text", () => {
    const [water, pumping] = BUILT_IN_PHOTOS;
    if (!water || !pumping) throw new Error("fixture");
    expect(
      builtInInLibrary([
        { id: "x", alt: "Otra foto" },
        { id: "p", alt: pumping.alt },
        { id: "w", alt: water.alt },
        { id: "w2", alt: water.alt },
      ]),
    ).toEqual(
      new Map([
        ["agua-manos.jpg", "w"],
        ["estacion-bombeo-tuberias.jpg", "p"],
      ]),
    );
  });
});
