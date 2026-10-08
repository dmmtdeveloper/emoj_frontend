import { describe, expect, it } from "vitest";
import type { ApiResult } from "../src/lib/api/client";
import {
  loadPreview,
  previewPath,
  setPreviewHeaders,
} from "../src/lib/content/preview";

const ok = (data: unknown) =>
  ({ ok: true, status: 200, data }) as ApiResult<never>;
const problem = (status: number) =>
  ({
    ok: false,
    kind: "problem",
    status,
    problem: { type: "about:blank", title: "x", status },
  }) as ApiResult<never>;

describe("previewPath", () => {
  it("links to the site's preview page with the token encoded", () => {
    expect(previewPath("a.b/c+d")).toBe("/preview?token=a.b%2Fc%2Bd");
  });
});

describe("setPreviewHeaders", () => {
  it("keeps a preview out of caches and search engines", () => {
    const headers = new Headers({ "Cache-Control": "public, max-age=60" });
    setPreviewHeaders(headers);
    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});

describe("loadPreview", () => {
  it("returns the project or article the token points at", async () => {
    const project = { slug: "planta", title: "Planta" };
    await expect(
      loadPreview("t", async () => ok({ type: "project", project })),
    ).resolves.toEqual({ kind: "project", project });
    const news = { slug: "hito", title: "Hito" };
    await expect(
      loadPreview("t", async () => ok({ type: "news", news })),
    ).resolves.toEqual({ kind: "news", news });
  });

  it("tells an expired or forged token apart from a missing item", async () => {
    await expect(loadPreview("t", async () => problem(401))).resolves.toEqual({
      kind: "expired",
    });
    await expect(loadPreview("t", async () => problem(404))).resolves.toEqual({
      kind: "not-found",
    });
  });

  it("treats a missing or overlong token as expired without calling the API", async () => {
    let called = false;
    const get = async () => {
      called = true;
      return problem(500);
    };
    await expect(loadPreview(null, get)).resolves.toEqual({ kind: "expired" });
    await expect(loadPreview("x".repeat(513), get)).resolves.toEqual({
      kind: "expired",
    });
    expect(called).toBe(false);
  });

  it("reports other failures as unavailable", async () => {
    await expect(loadPreview("t", async () => problem(503))).resolves.toEqual({
      kind: "unavailable",
    });
    await expect(
      loadPreview("t", async () => ok({ type: "news" })),
    ).resolves.toEqual({ kind: "unavailable" });
  });
});
