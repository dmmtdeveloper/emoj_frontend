import { describe, expect, it } from "vitest";
import type { AdminHomeHero } from "../src/lib/admin/api";
import {
  addPhotos,
  CUSTOM_LINK,
  heroChecklist,
  HERO_TABS,
  linkChoice,
  linkOptions,
  errorsFromProblem,
  focusFromPoint,
  formFromHero,
  heroInput,
  HERO_LIMITS,
  hrefError,
  moveFocus,
  sameForm,
  validateHero,
  type HeroForm,
} from "../src/lib/admin/home-hero-form";

const hero: AdminHomeHero = {
  title: "Más de 30 años innovando en consultoría",
  highlight: "innovando",
  lead: "Diseñamos soluciones.",
  primaryCta: { label: "Cotizar proyecto", href: "/contacto" },
  secondaryCta: { label: "", href: "" },
  photos: [
    {
      mediaId: "m1",
      focusX: 30,
      focusY: 70,
      media: {
        url: "https://cdn.test/a.webp",
        alt: "Planta",
        width: 1800,
        height: 1200,
      },
    },
  ],
  updatedAt: "2026-10-12T18:00:00Z",
};

const valid = (): HeroForm => formFromHero(hero);

describe("formFromHero and heroInput", () => {
  it("round-trips the hero, dropping the thumbnails", () => {
    expect(heroInput(valid())).toEqual({
      title: hero.title,
      highlight: "innovando",
      lead: "Diseñamos soluciones.",
      primaryCta: { label: "Cotizar proyecto", href: "/contacto" },
      secondaryCta: { label: "", href: "" },
      photos: [{ mediaId: "m1", focusX: 30, focusY: 70 }],
    });
  });

  it("trims every text", () => {
    const form = {
      ...valid(),
      title: "  Agua  ",
      highlight: " Agua ",
      primaryHref: " /contacto ",
    };
    const input = heroInput(form);
    expect(input.title).toBe("Agua");
    expect(input.highlight).toBe("Agua");
    expect(input.primaryCta.href).toBe("/contacto");
  });
});

describe("sameForm", () => {
  it("tells whether there is anything to save", () => {
    expect(sameForm(valid(), valid())).toBe(true);
    expect(sameForm(valid(), { ...valid(), lead: "Otro" })).toBe(false);
    const moved = valid();
    moved.photos = [{ mediaId: "m1", focusX: 35, focusY: 70 }];
    expect(sameForm(valid(), moved)).toBe(false);
  });
});

describe("hrefError", () => {
  it("accepts site paths, https, mailto and tel", () => {
    for (const href of [
      "/contacto",
      "/servicios?x=1#agua",
      "https://wa.me/56912345678",
      "mailto:coordinacion@emoj.cl",
      "tel:+56322123456",
    ]) {
      expect(hrefError(href)).toBeNull();
    }
  });

  it("rejects everything else", () => {
    for (const href of [
      "contacto",
      "//evil.test",
      "http://emoj.cl",
      "javascript:alert(1)",
      "/con tacto",
      "https://",
    ]) {
      expect(hrefError(href)).toMatch(/empiece con \//);
    }
  });
});

describe("validateHero", () => {
  it("passes a valid hero", () => {
    expect(validateHero(valid())).toEqual({});
  });

  it("asks for a title, a lead and the main button", () => {
    const errors = validateHero({
      ...valid(),
      title: " ",
      highlight: "",
      lead: "",
      primaryLabel: "",
      primaryHref: "",
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["lead", "primaryHref", "primaryLabel", "title"].sort(),
    );
  });

  it("requires the highlight to appear in the title as written", () => {
    expect(
      validateHero({ ...valid(), highlight: "Innovando" }).highlight,
    ).toMatch(/tal como aparece/);
  });

  it("checks the lengths", () => {
    const errors = validateHero({
      ...valid(),
      title: "a".repeat(HERO_LIMITS.title + 1),
      highlight: "",
      lead: "b".repeat(HERO_LIMITS.lead + 1),
      primaryLabel: "c".repeat(HERO_LIMITS.label + 1),
    });
    expect(errors.title).toMatch(/120/);
    expect(errors.lead).toMatch(/300/);
    expect(errors.primaryLabel).toMatch(/40/);
  });

  it("allows an empty secondary button but not a half-filled one", () => {
    expect(
      validateHero({ ...valid(), secondaryLabel: "", secondaryHref: "" }),
    ).toEqual({});
    expect(
      validateHero({
        ...valid(),
        secondaryLabel: "Ver proyectos",
        secondaryHref: "",
      }).secondaryHref,
    ).toMatch(/deja ambos vacíos/);
    expect(
      validateHero({
        ...valid(),
        secondaryLabel: "",
        secondaryHref: "/proyectos",
      }).secondaryLabel,
    ).toMatch(/deja ambos vacíos/);
  });

  it("caps the photos", () => {
    const photos = Array.from({ length: HERO_LIMITS.photos + 1 }, (_, i) => ({
      mediaId: `m${i}`,
      focusX: 50,
      focusY: 50,
    }));
    expect(validateHero({ ...valid(), photos }).photos).toMatch(/8/);
  });
});

describe("errorsFromProblem", () => {
  it("puts the API's field errors on the form fields", () => {
    expect(
      errorsFromProblem([
        { field: "title", message: "is required" },
        { field: "primaryCta.href", message: "must be a site path" },
        { field: "secondaryCta.label", message: "is required" },
        { field: "photos", message: "references unknown media" },
        { field: "photos.focus", message: "must be between 0 and 100" },
      ]),
    ).toEqual({
      title: "Este campo es obligatorio.",
      primaryHref: expect.stringMatching(/empiece con \//),
      secondaryLabel: "Este campo es obligatorio.",
      photos:
        "Alguna foto ya no está en la biblioteca: quítala y vuelve a guardar.",
    });
  });
});

describe("addPhotos", () => {
  it("appends new photos centered, skipping repeats, up to 8", () => {
    const current = [{ mediaId: "a", focusX: 20, focusY: 30 }];
    const { photos, skipped } = addPhotos(current, ["a", "b", "c"]);
    expect(photos).toEqual([
      { mediaId: "a", focusX: 20, focusY: 30 },
      { mediaId: "b", focusX: 50, focusY: 50 },
      { mediaId: "c", focusX: 50, focusY: 50 },
    ]);
    expect(skipped).toBe(0);

    const full = Array.from({ length: 7 }, (_, i) => ({
      mediaId: `m${i}`,
      focusX: 50,
      focusY: 50,
    }));
    const capped = addPhotos(full, ["x", "y", "z"]);
    expect(capped.photos).toHaveLength(8);
    expect(capped.skipped).toBe(2);
  });
});

describe("focal point", () => {
  it("snaps a click on the photo to 5% steps", () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 };
    expect(focusFromPoint(rect, 100 + 130, 50 + 141)).toEqual({ x: 35, y: 70 });
    expect(focusFromPoint(rect, 0, 999)).toEqual({ x: 0, y: 100 });
  });

  it("moves with the arrow keys (bigger steps with Shift)", () => {
    const at = { x: 50, y: 50 };
    expect(moveFocus(at, "ArrowLeft", false)).toEqual({ x: 45, y: 50 });
    expect(moveFocus(at, "ArrowDown", true)).toEqual({ x: 50, y: 70 });
    expect(moveFocus({ x: 100, y: 0 }, "ArrowRight", false)).toEqual({
      x: 100,
      y: 0,
    });
    expect(moveFocus({ x: 100, y: 0 }, "ArrowUp", false)).toEqual({
      x: 100,
      y: 0,
    });
    expect(moveFocus(at, "Home", false)).toBeNull();
  });
});

describe("link options", () => {
  const options = linkOptions({
    "obras-sanitarias": "Obras sanitarias",
    geotecnia: "Geotecnia",
  });

  it("offers the site pages, the services and the contact channels", () => {
    const values = options.map((o) => o.value);
    expect(values).toContain("/contacto");
    expect(values).toContain("/proyectos");
    expect(values).toContain("/servicios/geotecnia");
    expect(values.some((v) => v.startsWith("https://wa.me/"))).toBe(true);
    expect(values.some((v) => v.startsWith("tel:"))).toBe(true);
    expect(values).toContain("mailto:coordinacion@emoj.cl");
    expect(new Set(values).size).toBe(values.length);
    expect(options.find((o) => o.value === "/servicios/geotecnia")?.label).toBe(
      "Geotecnia",
    );
    for (const o of options) expect(hrefError(o.value)).toBeNull();
  });

  it("finds the option of a link, or marks it as another link", () => {
    expect(linkChoice("/contacto", options)).toBe("/contacto");
    expect(linkChoice(" /contacto ", options)).toBe("/contacto");
    expect(linkChoice("/otra-pagina", options)).toBe(CUSTOM_LINK);
    expect(linkChoice("", options)).toBe("");
  });
});

describe("heroChecklist", () => {
  it("marks each step done when its required fields are filled", () => {
    const done = (form: HeroForm) =>
      Object.fromEntries(heroChecklist(form).map((i) => [i.field, i.done]));
    expect(done(valid())).toMatchObject({
      title: true,
      lead: true,
      primaryLabel: true,
      primaryHref: true,
      photos: true,
    });
    expect(done({ ...valid(), lead: " ", photos: [] })).toMatchObject({
      lead: false,
      photos: false,
    });
    for (const item of heroChecklist(valid())) {
      expect(HERO_TABS.some((t) => t.fields.includes(item.field))).toBe(true);
    }
  });
});
