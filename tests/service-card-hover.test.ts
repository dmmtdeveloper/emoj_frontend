import { describe, expect, it } from "vitest";
import { onPhotoClasses } from "../src/lib/service-card-hover";

describe("onPhotoClasses", () => {
  it("turns the card's text light on hover when a photo fades in", () => {
    const classes = onPhotoClasses(true);
    expect(classes.title).toContain("group-hover:text-sand-50");
    expect(classes.muted).toContain("group-hover:text-sand-100");
    expect(classes.link).toContain("group-hover:text-sand-50");
    expect(classes.ring).toContain("group-hover:border-sand-50/60");
  });

  it("keeps the focus-visible state in step with hover", () => {
    const classes = onPhotoClasses(true);
    expect(classes.title).toContain("group-has-[a:focus-visible]:text-sand-50");
    expect(classes.muted).toContain(
      "group-has-[a:focus-visible]:text-sand-100",
    );
  });

  // Without a photo the card keeps its light surface on hover: cream text
  // there is invisible in the light theme ("Estudios de tránsito").
  it("adds nothing when there is no photo behind the text", () => {
    expect(onPhotoClasses(false)).toEqual({
      title: "",
      muted: "",
      link: "",
      ring: "",
    });
  });
});
