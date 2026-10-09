import { describe, expect, it } from "vitest";
import { CONTACT } from "../src/lib/site";
import { whatsappHref, whatsappMessage } from "../src/lib/whatsapp";

const text = (href: string) => new URL(href).searchParams.get("text");

describe("whatsappMessage", () => {
  it("asks for a quote by default", () => {
    expect(whatsappMessage()).toBe("Hola, quiero cotizar un proyecto.");
  });

  it("names the service the visitor is reading about", () => {
    expect(
      whatsappMessage({ kind: "service", title: "Cálculo estructural" }),
    ).toBe("Hola, quiero cotizar un proyecto de cálculo estructural.");
  });

  it("refers to the project or article the visitor saw", () => {
    expect(whatsappMessage({ kind: "project", title: "Puente Llollito" })).toBe(
      "Hola, vi el proyecto «Puente Llollito» en emoj.cl y quiero cotizar algo similar.",
    );
    expect(
      whatsappMessage({ kind: "article", title: "Visita al Canal La Petaca" }),
    ).toBe(
      "Hola, leí «Visita al Canal La Petaca» en emoj.cl y quiero conversar sobre un proyecto.",
    );
  });
});

describe("whatsappHref", () => {
  it("opens a chat with EMOJ's number and the message, encoded", () => {
    const href = whatsappHref({ kind: "service", title: "Geotecnia" });
    expect(href.startsWith("https://wa.me/56991589934?text=")).toBe(true);
    expect(text(href)).toBe("Hola, quiero cotizar un proyecto de geotecnia.");
  });

  it("keeps long titles from making the message unwieldy", () => {
    const title = "A".repeat(200);
    expect(text(whatsappHref({ kind: "project", title }))).toContain(
      `«${"A".repeat(79)}…»`,
    );
  });

  it("is the default link shared by the header, footer and contact page", () => {
    expect(CONTACT.whatsapp.href).toBe(whatsappHref());
  });
});
