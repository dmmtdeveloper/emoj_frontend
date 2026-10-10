import { describe, expect, it } from "vitest";
import { projectMagnitude } from "../src/lib/content/magnitude";

describe("projectMagnitude", () => {
  it("returns the figure ready to show, trimmed", () => {
    expect(
      projectMagnitude({ label: " Caudal ", value: " 1.200 ", unit: " l/s " }),
    ).toEqual({ label: "Caudal", value: "1.200", unit: "l/s" });
  });

  it("allows a figure without label or unit", () => {
    expect(projectMagnitude({ value: "35" })).toEqual({
      label: "",
      value: "35",
      unit: "",
    });
  });

  it("returns null when there is no figure", () => {
    expect(projectMagnitude(undefined)).toBeNull();
    expect(
      projectMagnitude({ label: "Caudal", value: "  ", unit: "" }),
    ).toBeNull();
  });
});
