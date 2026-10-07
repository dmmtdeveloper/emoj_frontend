import { describe, expect, it } from "vitest";
import type { PersonDataExport } from "../src/lib/admin/api";
import {
  accessReport,
  dataRequestLabel,
  exportFileName,
  exportFileContent,
  subjectEmailError,
} from "../src/lib/admin/privacy-requests";
import { PRIVACY } from "../src/lib/privacy";

describe("subjectEmailError", () => {
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
    expect(subjectEmailError(input)).toBe(message);
  });

  it("accepts an address with surrounding spaces", () => {
    expect(subjectEmailError("  Ana@Empresa.cl ")).toBeNull();
  });

  it("rejects addresses longer than the API accepts", () => {
    expect(subjectEmailError(`${"a".repeat(250)}@b.cl`)).toBe(
      "El correo es demasiado largo.",
    );
  });
});

describe("exportFileName", () => {
  it("names the file after the person and the Chilean date of the export", () => {
    expect(exportFileName("Ana.Pérez@Empresa.cl", "2026-10-07T02:30:00Z")).toBe(
      "datos-personales-ana-perez-empresa-cl-2026-10-06.json",
    );
  });
});

describe("exportFileContent", () => {
  it("is indented JSON that ends with a newline", () => {
    expect(exportFileContent({ a: 1 })).toBe('{\n  "a": 1\n}\n');
  });
});

describe("dataRequestLabel", () => {
  it("describes each kind of request with its message count", () => {
    expect(dataRequestLabel("export", 0)).toBe("Exportación · sin mensajes");
    expect(dataRequestLabel("export", 1)).toBe("Exportación · 1 mensaje");
    expect(dataRequestLabel("erasure", 3)).toBe("Eliminación · 3 mensajes");
  });
});

describe("accessReport", () => {
  const exported: PersonDataExport = {
    request: {
      id: "0d9f6a43-5d4d-4c2a-9a59-2f1b3c1d2e3f",
      kind: "export",
      email: "ana@empresa.cl",
      messages: 0,
      performedBy: "Editora",
      createdAt: "2026-10-06T15:00:00Z",
    },
    email: "ana@empresa.cl",
    generatedAt: "2026-10-06T15:00:00Z",
    messages: [],
  };

  it("keeps the exported data untouched", () => {
    const report = accessReport(exported);
    expect(report.email).toBe("ana@empresa.cl");
    expect(report.messages).toEqual([]);
    expect(report.request).toEqual(exported.request);
  });

  it("adds what art. 5 requires besides the data itself", () => {
    const { information } = accessReport(exported);
    expect(information.controller).toEqual({
      name: "EMOJ Consultora SpA",
      rut: "76.956.190-0",
      email: "coordinacion@emoj.cl",
    });
    expect(information.source).toBe(PRIVACY.sources);
    expect(information.processing.map((p) => p.activity)).toEqual([
      "Formulario de contacto",
      "Solicitudes sobre tus datos",
    ]);
    for (const p of information.processing) {
      expect(p.purpose).not.toBe("");
      expect(p.legalBasis).not.toBe("");
      expect(p.retention).not.toBe("");
    }
    expect(information.recipients.map((r) => r.name)).toEqual(
      PRIVACY.processors.map((p) => p.name),
    );
    expect(information.automatedDecisions).toBe(PRIVACY.automatedDecisions);
    expect(information.policy).toBe(
      `https://emoj.cl/privacidad (versión ${PRIVACY.version})`,
    );
  });
});
