import { describe, expect, it } from "vitest";
import {
  newsTransitionName,
  projectSlugFromUrl,
  projectTransitionName,
  transitionNameFromUrl,
} from "../src/lib/content/transition";

describe("projectTransitionName", () => {
  it("prefixes the slug so the name never starts with a digit", () => {
    expect(projectTransitionName("diseno-estructural-puente-llollito")).toBe(
      "project-diseno-estructural-puente-llollito",
    );
    expect(projectTransitionName("2025-planta")).toBe("project-2025-planta");
  });

  it("replaces characters that are not valid in a CSS identifier", () => {
    expect(projectTransitionName("Planta de Agua/Ñuñoa")).toBe(
      "project-planta-de-agua-u-oa",
    );
  });

  it("gives the same name for the same slug (card and detail page match)", () => {
    expect(projectTransitionName("a-b")).toBe(projectTransitionName("a-b"));
  });
});

describe("projectSlugFromUrl", () => {
  it("returns the slug of a project page", () => {
    expect(
      projectSlugFromUrl("https://emoj.cl/proyectos/diseno-puente-llollito"),
    ).toBe("diseno-puente-llollito");
  });

  it("ignores a trailing slash, query and hash", () => {
    expect(
      projectSlugFromUrl("http://localhost:4321/proyectos/a-b/?x=1#f"),
    ).toBe("a-b");
  });

  it("decodes escaped characters", () => {
    expect(projectSlugFromUrl("https://emoj.cl/proyectos/planta-%C3%B1u")).toBe(
      "planta-ñu",
    );
  });

  it("returns null for the list and for other pages", () => {
    expect(projectSlugFromUrl("https://emoj.cl/proyectos")).toBeNull();
    expect(projectSlugFromUrl("https://emoj.cl/proyectos/")).toBeNull();
    expect(projectSlugFromUrl("https://emoj.cl/servicios/agua")).toBeNull();
    expect(projectSlugFromUrl("https://emoj.cl/proyectos/a/b")).toBeNull();
  });

  it("returns null for a URL it cannot parse", () => {
    expect(projectSlugFromUrl("not a url")).toBeNull();
  });
});

describe("newsTransitionName", () => {
  it("names news photos apart from project photos", () => {
    expect(newsTransitionName("visita-canal")).toBe("news-visita-canal");
    expect(newsTransitionName("a-b")).not.toBe(projectTransitionName("a-b"));
  });
});

describe("transitionNameFromUrl", () => {
  it("names the photo of the project or article being opened", () => {
    expect(transitionNameFromUrl("https://emoj.cl/proyectos/a-b")).toBe(
      "project-a-b",
    );
    expect(
      transitionNameFromUrl("https://emoj.cl/noticias/visita-canal/"),
    ).toBe("news-visita-canal");
  });

  it("returns null for lists, news pages and other pages", () => {
    expect(transitionNameFromUrl("https://emoj.cl/noticias")).toBeNull();
    expect(
      transitionNameFromUrl("https://emoj.cl/noticias/pagina/2"),
    ).toBeNull();
    expect(transitionNameFromUrl("https://emoj.cl/servicios/agua")).toBeNull();
    expect(transitionNameFromUrl("not a url")).toBeNull();
  });
});
