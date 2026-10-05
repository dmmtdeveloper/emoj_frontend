import { describe, expect, it } from "vitest";
import { isInAppClick, pageForPath } from "../src/lib/admin/router";

describe("pageForPath", () => {
  it("maps each panel section, with or without a trailing slash", () => {
    expect(pageForPath("/admin")).toBe("dashboard");
    expect(pageForPath("/admin/")).toBe("dashboard");
    expect(pageForPath("/admin/proyectos")).toBe("projects");
    expect(pageForPath("/admin/noticias/")).toBe("news");
    expect(pageForPath("/admin/medios")).toBe("media");
    expect(pageForPath("/admin/mensajes")).toBe("messages");
    expect(pageForPath("/admin/cuenta")).toBe("account");
  });

  it("returns null for the sign-in pages and anything else", () => {
    expect(pageForPath("/admin/login")).toBeNull();
    expect(pageForPath("/admin/restablecer")).toBeNull();
    expect(pageForPath("/admin/desconocido")).toBeNull();
    expect(pageForPath("/servicios")).toBeNull();
  });
});

describe("isInAppClick", () => {
  const plain = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
  };
  const origin = "http://localhost:4321";

  it("handles a plain click on a panel section", () => {
    expect(
      isInAppClick(
        plain,
        { href: `${origin}/admin/mensajes`, target: "" },
        origin,
      ),
    ).toBe(true);
  });

  it("lets the browser handle new-tab gestures", () => {
    expect(
      isInAppClick(
        { ...plain, ctrlKey: true },
        { href: `${origin}/admin`, target: "" },
        origin,
      ),
    ).toBe(false);
    expect(
      isInAppClick(
        { ...plain, metaKey: true },
        { href: `${origin}/admin`, target: "" },
        origin,
      ),
    ).toBe(false);
    expect(
      isInAppClick(
        { ...plain, shiftKey: true },
        { href: `${origin}/admin`, target: "" },
        origin,
      ),
    ).toBe(false);
    expect(
      isInAppClick(
        { ...plain, button: 1 },
        { href: `${origin}/admin`, target: "" },
        origin,
      ),
    ).toBe(false);
    expect(
      isInAppClick(
        plain,
        { href: `${origin}/admin`, target: "_blank" },
        origin,
      ),
    ).toBe(false);
  });

  it("does not intercept links outside the panel sections", () => {
    expect(
      isInAppClick(plain, { href: `${origin}/`, target: "" }, origin),
    ).toBe(false);
    expect(
      isInAppClick(
        plain,
        { href: `${origin}/admin/login`, target: "" },
        origin,
      ),
    ).toBe(false);
    expect(
      isInAppClick(
        plain,
        { href: "https://otro.cl/admin", target: "" },
        origin,
      ),
    ).toBe(false);
    expect(
      isInAppClick(
        { ...plain, defaultPrevented: true },
        { href: `${origin}/admin`, target: "" },
        origin,
      ),
    ).toBe(false);
  });
});
