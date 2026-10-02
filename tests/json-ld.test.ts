import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../src/lib/json-ld";

describe("serializeJsonLd", () => {
  it("escapes < so the payload cannot close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });
});
