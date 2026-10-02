import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TEAM } from "../src/lib/team";

const members = TEAM.flatMap((d) => d.members);

describe("TEAM", () => {
  it("keeps the departments of the current emoj.cl, in order", () => {
    expect(TEAM.map((d) => d.name)).toEqual([
      "Gerencia",
      "Departamento de Ingeniería",
      "Departamento de Dibujo",
      "Departamento de Administración",
    ]);
  });

  it("has the 13 people shown on emoj.cl/nosotros", () => {
    expect(members).toHaveLength(13);
  });

  it.each(members.map((m) => [m.name, m] as const))(
    "%s has a first and last name separated by a space",
    (_name, member) => {
      expect(member.name).toMatch(/^\p{Lu}\p{L}+ \p{Lu}\p{L}+$/u);
      expect(member.role.trim()).not.toBe("");
    },
  );

  it("points every photo to an existing optimized file", () => {
    for (const member of members) {
      if (member.photo) {
        expect(
          existsSync(`src/assets/team/${member.photo}.jpg`),
          member.photo,
        ).toBe(true);
      }
    }
  });

  it("uses initials only for the people without a real photo", () => {
    expect(members.filter((m) => !m.photo).map((m) => m.name)).toEqual([
      "Cristóbal Cea",
      "Patricio Astorga",
      "Diego Abuyeres",
      "Maxell Cayupe",
    ]);
  });
});
