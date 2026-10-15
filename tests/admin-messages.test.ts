import { describe, expect, it } from "vitest";
import {
  firstName,
  initials,
  replyMailto,
  telHref,
  whatsappHref,
} from "../src/lib/admin/messages";

const message = {
  name: "Carolina Vergara",
  email: "cvergara@aguasdelvalle.cl",
  message: "Necesitamos cotizar una red.\nGracias.",
  createdAt: "2026-10-15T20:05:00Z",
};

describe("initials", () => {
  it("takes the first letters of the first two words", () => {
    expect(initials("Carolina Vergara")).toBe("CV");
    expect(initials("  rodrigo  ")).toBe("R");
    expect(initials("")).toBe("?");
  });
});

describe("firstName", () => {
  it("is the first word, or empty", () => {
    expect(firstName("Carolina Vergara")).toBe("Carolina");
    expect(firstName("   ")).toBe("");
  });
});

describe("replyMailto", () => {
  it("writes to the sender with a subject, a greeting and the quoted message", () => {
    const href = replyMailto(message, "Obras sanitarias");
    const url = new URL(href);
    expect(url.protocol).toBe("mailto:");
    expect(decodeURIComponent(url.pathname)).toBe("cvergara@aguasdelvalle.cl");
    const subject = url.searchParams.get("subject");
    // Line breaks travel as CRLF (RFC 6068).
    const body = (url.searchParams.get("body") ?? "").replace(/\r\n/g, "\n");
    expect(subject).toBe("Tu consulta a EMOJ Consultora: Obras sanitarias");
    expect(body.startsWith("Hola Carolina,\n\n")).toBe(true);
    expect(body).toContain("> Necesitamos cotizar una red.\n> Gracias.");
  });

  it("uses a generic subject without a service and encodes spaces as %20", () => {
    const href = replyMailto({ ...message, name: "" }, undefined);
    expect(href).toContain("subject=Tu%20consulta%20a%20EMOJ%20Consultora&");
    expect(href).not.toContain("+");
    expect(
      new URL(href).searchParams.get("body")?.startsWith("Hola,\r\n\r\n"),
    ).toBe(true);
  });
});

describe("telHref", () => {
  it("keeps digits and the plus sign", () => {
    expect(telHref("+56 9 8765-4321")).toBe("tel:+56987654321");
  });
});

describe("whatsappHref", () => {
  it("links Chilean mobiles to wa.me with the country code", () => {
    expect(whatsappHref("+56 9 8765 4321")).toBe("https://wa.me/56987654321");
    expect(whatsappHref("9 8765 4321")).toBe("https://wa.me/56987654321");
    expect(whatsappHref("987654321")).toBe("https://wa.me/56987654321");
  });

  it("skips landlines and empty numbers", () => {
    expect(whatsappHref("+56 32 245 1100")).toBeNull();
    expect(whatsappHref("")).toBeNull();
  });
});
