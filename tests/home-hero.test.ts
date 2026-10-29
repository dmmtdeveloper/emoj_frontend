import { describe, expect, it } from "vitest";
import {
  BUILT_IN_PHOTOS,
  HERO_COPY,
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

describe("isExternalHref", () => {
  it("is true only for https links", () => {
    expect(isExternalHref("https://wa.me/56912345678")).toBe(true);
    expect(isExternalHref("/contacto")).toBe(false);
    expect(isExternalHref("mailto:coordinacion@emoj.cl")).toBe(false);
    expect(isExternalHref("tel:+56322123456")).toBe(false);
  });
});

describe("HERO_COPY", () => {
  it("is the copy the home hero shows", () => {
    expect(HERO_COPY).toEqual({
      title: "Más de 30 años innovando en consultoría",
      highlight: "innovando",
      lead: "Diseñamos soluciones eficientes para el abastecimiento y saneamiento de agua, con la experiencia, la tecnología y la calidad que exige cada proyecto de ingeniería civil.",
      primaryCta: { label: "Cotizar proyecto", href: "/contacto" },
      secondaryCta: { label: "Ver proyectos", href: "/proyectos" },
    });
  });
});

describe("BUILT_IN_PHOTOS", () => {
  it("describes the three photos the hero plays", () => {
    expect(BUILT_IN_PHOTOS.map((p) => p.file)).toEqual([
      "agua-manos.jpg",
      "estacion-bombeo-tuberias.jpg",
      "vista-aerea-industrial.jpg",
    ]);
    for (const p of BUILT_IN_PHOTOS) {
      expect(p.alt.length).toBeGreaterThan(10);
    }
  });
});
