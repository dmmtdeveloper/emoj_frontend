import { describe, expect, it } from "vitest";
import { problemMessage } from "../src/lib/admin/errors";
import { activeNavItem, ADMIN_NAV } from "../src/lib/admin/nav";
import { loginUrl, safeNext } from "../src/lib/admin/redirect";

describe("safeNext", () => {
  it("keeps admin paths with their query", () => {
    expect(safeNext("/admin/mensajes?page=2")).toBe("/admin/mensajes?page=2");
  });

  it("falls back to the dashboard for anything outside the panel", () => {
    expect(safeNext(null)).toBe("/admin");
    expect(safeNext("")).toBe("/admin");
    expect(safeNext("https://evil.example/admin")).toBe("/admin");
    expect(safeNext("//evil.example/admin")).toBe("/admin");
    expect(safeNext("/administrador")).toBe("/admin");
    expect(safeNext("/admin/../x")).toBe("/admin");
    expect(safeNext("/admin\\evil")).toBe("/admin");
  });

  it("never sends a signed-in user back to the auth pages", () => {
    expect(safeNext("/admin/login")).toBe("/admin");
    expect(safeNext("/admin/recuperar")).toBe("/admin");
  });
});

describe("loginUrl", () => {
  it("carries the current page so login can return to it", () => {
    expect(loginUrl("/admin/mensajes", "?page=2")).toBe(
      "/admin/login?next=%2Fadmin%2Fmensajes%3Fpage%3D2",
    );
  });

  it("omits next for the dashboard", () => {
    expect(loginUrl("/admin", "")).toBe("/admin/login");
    expect(loginUrl("/admin/", "")).toBe("/admin/login");
  });
});

describe("activeNavItem", () => {
  it("matches the section and its sub pages", () => {
    expect(activeNavItem("/admin/proyectos")?.href).toBe("/admin/proyectos");
    expect(activeNavItem("/admin/proyectos/editar")?.href).toBe(
      "/admin/proyectos",
    );
    expect(activeNavItem("/admin/mensajes/")?.href).toBe("/admin/mensajes");
  });

  it("matches the dashboard only exactly", () => {
    expect(activeNavItem("/admin")?.href).toBe("/admin");
    expect(activeNavItem("/admin/")?.href).toBe("/admin");
    expect(activeNavItem("/admin/desconocido")).toBeUndefined();
  });

  it("lists the six sections in order", () => {
    expect(ADMIN_NAV.map((item) => item.label)).toEqual([
      "Resumen",
      "Proyectos",
      "Noticias",
      "Medios",
      "Mensajes",
      "Cuenta",
    ]);
  });
});

describe("problemMessage", () => {
  it("explains a lockout with the wait in minutes", () => {
    expect(
      problemMessage(
        {
          ok: false,
          kind: "problem",
          status: 429,
          problem: { type: "about:blank", title: "", status: 429 },
          retryAfter: 600,
        },
        "login",
      ),
    ).toBe(
      "Demasiados intentos. Por seguridad, espera 10 minutos antes de volver a intentarlo.",
    );
  });

  it("uses a generic credentials message for a failed login", () => {
    expect(
      problemMessage(
        {
          ok: false,
          kind: "problem",
          status: 401,
          problem: { type: "about:blank", title: "", status: 401 },
        },
        "login",
      ),
    ).toBe("El correo o la contraseña no son correctos.");
  });

  it("asks to sign in again when the session is gone", () => {
    expect(
      problemMessage({
        ok: false,
        kind: "problem",
        status: 401,
        problem: { type: "about:blank", title: "", status: 401 },
      }),
    ).toBe("Tu sesión terminó. Vuelve a iniciar sesión.");
  });

  it("explains network failures in plain words", () => {
    expect(problemMessage({ ok: false, kind: "network", error: null })).toBe(
      "No pudimos conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.",
    );
  });

  it("falls back to a generic message for server errors", () => {
    expect(
      problemMessage({
        ok: false,
        kind: "problem",
        status: 500,
        problem: { type: "about:blank", title: "Internal", status: 500 },
      }),
    ).toBe("Algo falló en el servidor. Inténtalo de nuevo en unos minutos.");
  });
});
