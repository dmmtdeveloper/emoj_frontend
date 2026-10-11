import { describe, expect, it } from "vitest";
import { lastItemSpan } from "../src/lib/layout/grid-span";

describe("lastItemSpan (2 columns from sm, 3 from lg)", () => {
  it("leaves full grids alone", () => {
    expect(lastItemSpan(6)).toBe("");
    expect(lastItemSpan(0)).toBe("");
  });

  it("stretches the last item over the empty cells of its row", () => {
    expect(lastItemSpan(5)).toBe("sm:col-span-2 lg:col-span-2");
    expect(lastItemSpan(4)).toBe("lg:col-span-3");
    expect(lastItemSpan(7)).toBe("sm:col-span-2 lg:col-span-3");
    expect(lastItemSpan(1)).toBe("sm:col-span-2 lg:col-span-3");
  });

  it("undoes the two-column stretch when three columns fill the row", () => {
    expect(lastItemSpan(3)).toBe("sm:col-span-2 lg:col-span-1");
  });
});
