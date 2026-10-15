import { describe, expect, it } from "vitest";
import { pageItems, resultSummary } from "../src/lib/admin/pagination";

describe("pageItems", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageItems(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps the first, last and neighbours of the current page", () => {
    expect(pageItems(1, 12)).toEqual([1, 2, 3, 4, 5, "…", 12]);
    expect(pageItems(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(pageItems(12, 12)).toEqual([1, "…", 8, 9, 10, 11, 12]);
  });

  it("never hides a single page behind an ellipsis", () => {
    expect(pageItems(4, 9)).toEqual([1, 2, 3, 4, 5, "…", 9]);
    expect(pageItems(5, 9)).toEqual([1, "…", 4, 5, 6, "…", 9]);
  });
});

describe("resultSummary", () => {
  const words = { one: "proyecto", many: "proyectos" };

  it("names a single result", () => {
    expect(resultSummary({ page: 1, pageSize: 5, total: 1, ...words })).toBe(
      "1 proyecto",
    );
  });

  it("gives the plain count when everything fits in one page", () => {
    expect(resultSummary({ page: 1, pageSize: 20, total: 7, ...words })).toBe(
      "7 proyectos",
    );
  });

  it("gives the range shown when there are more pages", () => {
    expect(resultSummary({ page: 1, pageSize: 5, total: 7, ...words })).toBe(
      "1–5 de 7 proyectos",
    );
    expect(resultSummary({ page: 2, pageSize: 5, total: 7, ...words })).toBe(
      "6–7 de 7 proyectos",
    );
  });

  it("says none when there are no results", () => {
    expect(resultSummary({ page: 1, pageSize: 5, total: 0, ...words })).toBe(
      "0 proyectos",
    );
  });
});
