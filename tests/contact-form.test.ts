import { describe, expect, it } from "vitest";
import type { ApiResult, ContactCreated } from "../src/lib/api/client";
import {
  CONTACT_FIELDS,
  describeSubmitResult,
  toContactRequest,
  validateContact,
  type ContactValues,
} from "../src/lib/contact/form";

const valid: ContactValues = {
  name: "Ana Pérez",
  email: "ana@empresa.cl",
  phone: "",
  company: "",
  service: "",
  location: "",
  message: "Necesito un estudio de mecánica de suelos.",
};

describe("validateContact", () => {
  it("accepts a valid form", () => {
    expect(validateContact(valid)).toEqual({});
  });

  it("requires name, email and message", () => {
    const errors = validateContact({
      ...valid,
      name: " ",
      email: "",
      message: "",
    });
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name"]);
  });

  it("rejects malformed emails", () => {
    expect(validateContact({ ...valid, email: "ana@empresa" }).email).toMatch(
      /correo válido/,
    );
    expect(
      validateContact({ ...valid, email: "ana empresa.cl" }).email,
    ).toBeDefined();
  });

  it("mirrors the API message length limits (10 to 5000)", () => {
    expect(
      validateContact({ ...valid, message: "123456789" }).message,
    ).toBeDefined();
    expect(
      validateContact({ ...valid, message: "1234567890" }).message,
    ).toBeUndefined();
    expect(
      validateContact({ ...valid, message: "a".repeat(5001) }).message,
    ).toBeDefined();
  });

  it("checks optional fields only for their maximum length", () => {
    const errors = validateContact({
      ...valid,
      phone: "1".repeat(41),
      company: "c".repeat(121),
      location: "l".repeat(121),
    });
    expect(Object.keys(errors).sort()).toEqual([
      "company",
      "location",
      "phone",
    ]);
  });

  it("rejects services that are not API slugs", () => {
    expect(
      validateContact({ ...valid, service: "otro" }).service,
    ).toBeDefined();
    expect(
      validateContact({ ...valid, service: "geotecnia" }).service,
    ).toBeUndefined();
  });
});

describe("toContactRequest", () => {
  it("trims values and omits empty optional fields", () => {
    const body = toContactRequest(
      { ...valid, name: "  Ana  ", company: "  ", service: "geotecnia" },
      "token-123",
    );
    expect(body).toEqual({
      name: "Ana",
      email: "ana@empresa.cl",
      service: "geotecnia",
      message: "Necesito un estudio de mecánica de suelos.",
      turnstileToken: "token-123",
    });
  });
});

describe("describeSubmitResult", () => {
  const ok: ApiResult<ContactCreated> = {
    ok: true,
    status: 201,
    data: { id: "0b6f6f0e-1111-4c1e-8f2a-1b2c3d4e5f60" },
  };

  it("reports success", () => {
    expect(describeSubmitResult(ok)).toEqual({ kind: "success" });
  });

  it("maps 422 field errors to Spanish messages for known fields", () => {
    const outcome = describeSubmitResult({
      ok: false,
      kind: "problem",
      status: 422,
      problem: {
        type: "about:blank",
        title: "Unprocessable Entity",
        status: 422,
        errors: [
          { field: "email", message: "must be a valid email address" },
          { field: "turnstileToken", message: "is required" },
          { field: "unknown", message: "is wrong" },
        ],
      },
    });
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind !== "invalid") throw new Error("expected invalid");
    expect(Object.keys(outcome.fieldErrors)).toEqual(["email"]);
    expect(outcome.captchaFailed).toBe(true);
  });

  it("explains the rate limit on 429", () => {
    const outcome = describeSubmitResult({
      ok: false,
      kind: "problem",
      status: 429,
      problem: { type: "about:blank", title: "Too Many Requests", status: 429 },
    });
    expect(outcome).toEqual({
      kind: "error",
      message:
        "Has enviado varias consultas seguidas. Intenta de nuevo en unos minutos.",
    });
  });

  it("falls back to a generic error for network failures and other statuses", () => {
    const network = describeSubmitResult({
      ok: false,
      kind: "network",
      error: new TypeError("Failed to fetch"),
    });
    const server = describeSubmitResult({
      ok: false,
      kind: "problem",
      status: 500,
      problem: {
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
      },
    });
    expect(network.kind).toBe("error");
    expect(server).toEqual(network);
  });

  it("lists the form fields in DOM order", () => {
    expect(CONTACT_FIELDS).toEqual([
      "name",
      "email",
      "phone",
      "company",
      "service",
      "location",
      "message",
    ]);
  });
});
