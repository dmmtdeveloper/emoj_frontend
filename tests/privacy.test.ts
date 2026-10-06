import { describe, expect, it } from "vitest";
import { PRIVACY, privacyGaps, type PrivacyPolicy } from "../src/lib/privacy";

const complete: PrivacyPolicy = {
  ...PRIVACY,
  controller: { ...PRIVACY.controller, rut: "76.000.000-0" },
  requestsEmail: "privacidad@emoj.cl",
  legalReview: "2026-11-15",
};

describe("privacyGaps", () => {
  it("lists what is still missing before the policy can be published", () => {
    const draft: PrivacyPolicy = {
      ...complete,
      controller: { ...complete.controller, rut: null },
      requestsEmail: null,
      legalReview: null,
    };
    expect(privacyGaps(draft)).toEqual([
      "RUT de EMOJ Consultora SpA",
      "Correo para ejercer los derechos (por ejemplo privacidad@emoj.cl)",
      "Revisión de un abogado",
    ]);
  });

  it("is empty once the RUT, the requests email and the legal review are in", () => {
    expect(privacyGaps(complete)).toEqual([]);
  });
});

describe("PRIVACY", () => {
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

  it("gives every processing activity a purpose, a legal basis and a retention period", () => {
    for (const activity of PRIVACY.activities) {
      expect(activity.purpose.trim()).not.toBe("");
      expect(activity.basis.trim()).not.toBe("");
      expect(activity.retention.trim()).not.toBe("");
    }
  });

  it("names the providers that receive personal data", () => {
    expect(PRIVACY.processors.map((p) => p.name)).toEqual([
      "Vercel",
      "Railway",
      "Resend",
      "Cloudflare",
    ]);
  });
});
