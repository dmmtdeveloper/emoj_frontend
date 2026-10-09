import type { APIContext } from "astro";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const diskImage = vi.fn(async () => new Response("disk"));
const devImage = vi.fn(async () => new Response("dev"));

vi.mock("astro/assets/endpoint/node", () => ({ GET: diskImage }));
vi.mock("astro/assets/endpoint/dev", () => ({ GET: devImage }));
vi.mock("astro/assets/endpoint/shared", () => ({
  handleImageRequest: vi.fn(async () => new Response("media")),
}));
vi.mock("../src/lib/content", () => ({ contentSource: vi.fn() }));
vi.mock("../src/lib/content/media-route", () => ({ serveMedia: vi.fn() }));
vi.mock("../src/lib/media-image", () => ({ loadMediaImage: vi.fn() }));

function context(href: string): APIContext {
  const url = `http://localhost:4321/_image?href=${encodeURIComponent(href)}&w=640&f=webp`;
  return {
    request: new Request(url),
    logger: { error: vi.fn() },
  } as unknown as APIContext;
}

async function body(href: string): Promise<string> {
  const { GET } = await import("../src/lib/image-endpoint");
  const response = await GET(context(href));
  return response.text();
}

describe("image endpoint", () => {
  beforeEach(() => {
    vi.resetModules();
    diskImage.mockClear();
    devImage.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads built images from disk on the Node server", async () => {
    vi.stubEnv("DEV", false);
    expect(await body("/_astro/agua.hash.jpg")).toBe("disk");
    expect(devImage).not.toHaveBeenCalled();
  });

  it("uses Astro's dev loader in `astro dev` (the disk one never returns there)", async () => {
    vi.stubEnv("DEV", true);
    expect(await body("/@fs/home/emoj/src/assets/photos/agua.jpg")).toBe("dev");
    expect(diskImage).not.toHaveBeenCalled();
  });

  it("loads content photos in-process in both modes", async () => {
    vi.stubEnv("DEV", true);
    expect(await body("/media/proyectos/a/foto.jpg")).toBe("media");
    vi.stubEnv("DEV", false);
    expect(await body("/media/proyectos/a/foto.jpg")).toBe("media");
    expect(diskImage).not.toHaveBeenCalled();
    expect(devImage).not.toHaveBeenCalled();
  });
});
