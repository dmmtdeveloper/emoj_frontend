import { describe, expect, it } from "vitest";
import { sharePageUrl, shareImageUrl } from "../src/lib/share-image";

const site = new URL("https://emoj.cl");

describe("shareImageUrl", () => {
  it("points pages rendered on demand at the host that served them", () => {
    expect(
      shareImageUrl("/og-default.jpg", {
        site,
        origin: "https://web-production-d68b2.up.railway.app",
        prerendered: false,
      }),
    ).toBe("https://web-production-d68b2.up.railway.app/og-default.jpg");
  });

  it("keeps the site for pages built ahead of time", () => {
    expect(
      shareImageUrl("/og-default.jpg", {
        site,
        origin: "https://emoj.cl",
        prerendered: true,
      }),
    ).toBe("https://emoj.cl/og-default.jpg");
  });

  it("keeps resized image paths and their query", () => {
    expect(
      shareImageUrl("/_image?href=%2Fmedia%2Fx&w=1200", {
        site,
        origin: "https://www.emoj.cl",
        prerendered: false,
      }),
    ).toBe("https://www.emoj.cl/_image?href=%2Fmedia%2Fx&w=1200");
  });

  it("leaves absolute image URLs alone", () => {
    expect(
      shareImageUrl("https://cdn.test/a.jpg", {
        site,
        origin: "https://www.emoj.cl",
        prerendered: false,
      }),
    ).toBe("https://cdn.test/a.jpg");
  });

  it("falls back to the site when the origin is not http(s)", () => {
    expect(
      shareImageUrl("/og-default.jpg", {
        site,
        origin: "null",
        prerendered: false,
      }),
    ).toBe("https://emoj.cl/og-default.jpg");
  });
});

describe("sharePageUrl", () => {
  it("names the host that served the page, so og:url matches the shared link", () => {
    expect(
      sharePageUrl("/proyectos", {
        site,
        origin: "https://web-production-d68b2.up.railway.app",
        prerendered: false,
      }),
    ).toBe("https://web-production-d68b2.up.railway.app/proyectos");
  });

  it("keeps the site for pages built ahead of time", () => {
    expect(
      sharePageUrl("/nosotros", {
        site,
        origin: "https://web-production-d68b2.up.railway.app",
        prerendered: true,
      }),
    ).toBe("https://emoj.cl/nosotros");
  });

  it("matches the canonical URL, without the trailing slash of the build", () => {
    expect(
      sharePageUrl("/proyectos/puente-llollito/", {
        site,
        origin: "https://emoj.cl",
        prerendered: true,
      }),
    ).toBe("https://emoj.cl/proyectos/puente-llollito");
    expect(
      sharePageUrl("/", { site, origin: "https://emoj.cl", prerendered: true }),
    ).toBe("https://emoj.cl/");
  });
});
