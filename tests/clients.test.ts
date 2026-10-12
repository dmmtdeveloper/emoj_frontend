import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLIENT_LOGOS } from "../src/lib/clients";
import { CLIENTS } from "../src/lib/site";

describe("CLIENT_LOGOS", () => {
  it("only names known clients", () => {
    for (const client of Object.keys(CLIENT_LOGOS)) {
      expect(CLIENTS).toContain(client);
    }
  });

  it("points every logo to an existing file", () => {
    for (const file of Object.values(CLIENT_LOGOS)) {
      expect(existsSync(`public/logos/clientes/${file}.svg`)).toBe(true);
    }
  });
});
