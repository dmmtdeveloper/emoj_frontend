import { describe, expect, it } from "vitest";
import { PRIVACY, privacyGaps, type PrivacyPolicy } from "../src/lib/privacy";

const complete: PrivacyPolicy = {
  ...PRIVACY,
  controller: {
    ...PRIVACY.controller,
    rut: "76.000.000-0",
    representative: "Ana Pérez",
  },
  requestsEmail: "privacidad@emoj.cl",
  processors: PRIVACY.processors.map((p) => ({ ...p, agreement: true })),
};

describe("privacyGaps", () => {
  it("lists what is still missing before the policy can be published", () => {
    const draft: PrivacyPolicy = {
      ...complete,
      controller: { ...complete.controller, rut: null, representative: null },
      requestsEmail: null,
      processors: complete.processors.map((p) =>
        p.name === "Railway" ? { ...p, agreement: false } : p,
      ),
    };
    expect(privacyGaps(draft)).toEqual([
      "RUT de EMOJ Consultora SpA",
      "Nombre del representante legal",
      "Correo para ejercer los derechos (por ejemplo privacidad@emoj.cl)",
      "Acuerdo de tratamiento de datos firmado con Railway",
    ]);
  });

  it("is empty once every required fact and agreement is in", () => {
    expect(privacyGaps(complete)).toEqual([]);
  });
});

describe("PRIVACY", () => {
  it("names EMOJ by its RUT and lists what EMOJ still has to provide", () => {
    expect(PRIVACY.controller.rut).toBe("76.956.190-0");
    expect(PRIVACY.requestsEmail).toBe("coordinacion@emoj.cl");
    expect(privacyGaps(PRIVACY)).toEqual([
      "Nombre del representante legal",
      "Acuerdo de tratamiento de datos firmado con Railway",
      "Acuerdo de tratamiento de datos firmado con Chilecom Datacenter",
    ]);
  });

  it("states its version and date (art. 14 ter a)", () => {
    expect(PRIVACY.version).toMatch(/^\d+\.\d+$/);
    expect(PRIVACY.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("describes who the data is about and where it comes from (art. 14 ter d, j)", () => {
    expect(PRIVACY.audience.length).toBeGreaterThan(0);
    expect(PRIVACY.sources).toMatch(/entregas tú/);
  });

  it("covers every right the law gives to data subjects", () => {
    expect(PRIVACY.rights.map((r) => r.name)).toEqual([
      "Acceso",
      "Rectificación",
      "Supresión",
      "Oposición",
      "Portabilidad",
      "Bloqueo temporal",
    ]);
  });

  it("explains the request procedure and its legal deadlines (art. 11)", () => {
    const steps = PRIVACY.requestSteps.join(" ");
    expect(steps).toMatch(/confirmamos que la recibimos/);
    expect(steps).toMatch(/30 días corridos/);
    expect(steps).toMatch(/2 días hábiles/);
    expect(PRIVACY.claim).toMatch(/Agencia de Protección de Datos Personales/);
    expect(PRIVACY.claim).toMatch(/30 días hábiles/);
  });

  it("gives every processing activity a purpose, a legal basis and a retention period", () => {
    for (const activity of PRIVACY.activities) {
      expect(activity.purpose.trim()).not.toBe("");
      expect(activity.basis.trim()).not.toBe("");
      expect(activity.retention.trim()).not.toBe("");
    }
  });

  it("keeps the log of data requests, which the law requires to prove the answer", () => {
    const log = PRIVACY.activities.find((a) => a.id === "requests");
    expect(log?.retention).toMatch(/4 años/);
  });

  it("names every provider with its country and safeguard (art. 14 ter h)", () => {
    expect(PRIVACY.processors.map((p) => p.name)).toEqual([
      "Vercel",
      "Railway",
      "Resend",
      "Cloudflare",
      "Chilecom Datacenter",
    ]);
    for (const p of PRIVACY.processors) {
      expect(p.country.trim()).not.toBe("");
      expect(p.safeguard.trim()).not.toBe("");
    }
  });

  it("says whether there are automated decisions or profiling (art. 14 ter l)", () => {
    expect(PRIVACY.automatedDecisions).toMatch(/No tomamos decisiones/);
  });

  it("describes the security measures (art. 14 ter e)", () => {
    expect(PRIVACY.security.length).toBeGreaterThanOrEqual(3);
  });
});
