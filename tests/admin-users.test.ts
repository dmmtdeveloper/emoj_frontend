import { describe, expect, it } from "vitest";
import type { ManagedUser } from "../src/lib/admin/api";
import {
  canOpen,
  emailError,
  inviteErrors,
  isInvitation,
  lastAccessLabel,
  navFor,
  resetMessage,
  ROLE_LABEL,
  STATUS_LABEL,
  userActionMessage,
  userActions,
} from "../src/lib/admin/users";

const conflict = {
  ok: false as const,
  kind: "problem" as const,
  status: 409,
  problem: { type: "about:blank", title: "Conflict", status: 409 },
};

function user(over: Partial<ManagedUser> = {}): ManagedUser {
  return {
    id: "u2",
    email: "ana@emoj.cl",
    name: "Ana",
    role: "editor",
    status: "active",
    createdAt: "2026-10-01T12:00:00Z",
    lastLoginAt: null,
    disabledAt: null,
    ...over,
  };
}

describe("navFor", () => {
  it("shows every section to an admin", () => {
    expect(navFor("admin").map((item) => item.label)).toContain("Usuarios");
  });

  it("has no contact messages section (the site has no form)", () => {
    expect(navFor("admin").map((item) => item.label)).not.toContain("Mensajes");
  });

  it("hides user management from an editor", () => {
    expect(navFor("editor").map((item) => item.label)).toEqual([
      "Resumen",
      "Portada",
      "Proyectos",
      "Noticias",
      "Medios",
      "Cuenta",
    ]);
  });
});

describe("emailError", () => {
  it.each([
    ["", "Escribe el correo de la persona."],
    ["   ", "Escribe el correo de la persona."],
    ["ana", "Revisa el correo: debe tener la forma nombre@dominio.cl."],
    ["ana@", "Revisa el correo: debe tener la forma nombre@dominio.cl."],
    [
      "ana @empresa.cl",
      "Revisa el correo: debe tener la forma nombre@dominio.cl.",
    ],
  ])("rejects %j", (input, message) => {
    expect(emailError(input)).toBe(message);
  });

  it("accepts an address with surrounding spaces", () => {
    expect(emailError("  Ana@Empresa.cl ")).toBeNull();
  });

  it("rejects addresses longer than the API accepts", () => {
    expect(emailError(`${"a".repeat(250)}@b.cl`)).toBe(
      "El correo es demasiado largo.",
    );
  });
});

describe("canOpen", () => {
  it("lets admins open every page", () => {
    expect(canOpen("users", "admin")).toBe(true);
  });

  it("keeps editors out of users only", () => {
    expect(canOpen("users", "editor")).toBe(false);
    expect(canOpen("projects", "editor")).toBe(true);
    expect(canOpen("account", "editor")).toBe(true);
  });
});

describe("labels", () => {
  it("names roles and statuses in Spanish", () => {
    expect(ROLE_LABEL).toEqual({ admin: "Administrador", editor: "Editor" });
    expect(STATUS_LABEL).toEqual({
      active: "Activo",
      invited: "Invitación pendiente",
      disabled: "Sin acceso",
    });
  });

  it("shows the last access in Chile time, or that there is none", () => {
    expect(lastAccessLabel(null)).toBe("Nunca");
    expect(lastAccessLabel("2026-10-13T02:30:00Z")).toBe("12-10-2026");
  });
});

describe("inviteErrors", () => {
  it("accepts a name and a valid email", () => {
    expect(inviteErrors({ name: " Ana ", email: "ana@emoj.cl" })).toEqual({});
  });

  it("asks for the name and a valid email", () => {
    expect(inviteErrors({ name: "  ", email: "" })).toEqual({
      name: "Escribe el nombre de la persona.",
      email: "Escribe el correo de la persona.",
    });
    expect(inviteErrors({ name: "Ana", email: "ana@emoj" }).email).toBe(
      "Revisa el correo: debe tener la forma nombre@dominio.cl.",
    );
  });

  it("limits the name to 120 characters", () => {
    expect(inviteErrors({ name: "a".repeat(121), email: "a@b.cl" }).name).toBe(
      "Puede tener hasta 120 caracteres.",
    );
  });
});

describe("userActions", () => {
  it("offers nothing on your own row", () => {
    expect(userActions(user({ id: "me" }), "me")).toEqual([]);
  });

  it("offers a role change and removing access for an active user", () => {
    expect(userActions(user(), "me")).toEqual(["role", "disable"]);
  });

  it("offers resending a pending invitation", () => {
    expect(userActions(user({ status: "invited" }), "me")).toEqual([
      "role",
      "resend",
      "disable",
    ]);
  });

  it("offers restoring access to a disabled user", () => {
    expect(
      userActions(
        user({ status: "disabled", disabledAt: "2026-10-02T00:00:00Z" }),
        "me",
      ),
    ).toEqual(["enable"]);
  });
});

describe("userActionMessage", () => {
  it("explains an email already in use", () => {
    expect(userActionMessage("invite", conflict)).toBe(
      "Ya existe un usuario con ese correo.",
    );
  });

  it("explains that one admin must keep access", () => {
    const message =
      "Debe quedar al menos un administrador activo. Nombra otro administrador antes de hacer este cambio.";
    expect(userActionMessage("role", conflict)).toBe(message);
    expect(userActionMessage("disable", conflict)).toBe(message);
  });

  it("explains an invitation that was already accepted", () => {
    expect(userActionMessage("resend", conflict)).toBe(
      "Esta persona ya creó su contraseña; no hay invitación pendiente.",
    );
  });

  it("falls back to the general messages", () => {
    expect(
      userActionMessage("enable", { ok: false, kind: "network", error: null }),
    ).toBe(
      "No pudimos conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.",
    );
    expect(
      userActionMessage("invite", {
        ...conflict,
        status: 403,
        problem: {
          ...conflict.problem,
          status: 403,
          detail: "Only administrators can do this.",
        },
      }),
    ).toBe("Solo un administrador puede gestionar usuarios.");
    expect(
      userActionMessage("invite", {
        ...conflict,
        status: 403,
        problem: { ...conflict.problem, status: 403 },
      }),
    ).toBe(
      "No pudimos verificar tu sesión. Recarga la página e inténtalo de nuevo.",
    );
  });
});

describe("invitation links", () => {
  it("recognizes an invitation from the link", () => {
    expect(isInvitation("?token=abc&invitacion=1")).toBe(true);
    expect(isInvitation("?token=abc")).toBe(false);
  });

  it("asks for a new invitation when the link expired", () => {
    const expired = {
      ok: false as const,
      kind: "problem" as const,
      status: 400,
      problem: { type: "about:blank", title: "Bad Request", status: 400 },
    };
    expect(resetMessage(expired, true)).toBe(
      "La invitación no es válida o ya venció. Pide a un administrador que te la reenvíe.",
    );
    expect(resetMessage(expired, false)).toBe(
      "El enlace para cambiar la contraseña no es válido o ya venció. Pide uno nuevo.",
    );
  });
});
